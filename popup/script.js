const ui = {
  scrapeButton: document.getElementById("scrape-btn"),
  statusEl: document.getElementById("status"),
  outputEl: document.getElementById("output"),
  skipInput: document.getElementById("skip-input"),
  limitInput: document.getElementById("limit-input"),
};

const STORAGE_KEYS = {
  webhookUrl: "linkedinWebhookUrl",
  apiToken: "linkedinApiToken",
};

const toNonNegativeInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const setStatus = (message) => {
  ui.statusEl.textContent = message;
};

const isValidWebhookUrl = (value) => {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch (error) {
    return false;
  }
};

const readOptions = () => {
  const skip = toNonNegativeInt(ui.skipInput.value);
  const limit = toNonNegativeInt(ui.limitInput.value);
  return { skip, limit };
};

const loadSettings = async () => {
  const stored = await chrome.storage.sync.get([
    STORAGE_KEYS.webhookUrl,
    STORAGE_KEYS.apiToken,
  ]);

  return {
    webhookUrl:
      typeof stored[STORAGE_KEYS.webhookUrl] === "string"
        ? stored[STORAGE_KEYS.webhookUrl].trim()
        : "",
    apiToken:
      typeof stored[STORAGE_KEYS.apiToken] === "string"
        ? stored[STORAGE_KEYS.apiToken].trim()
        : "",
  };
};

const sendToWebhook = async (webhookUrl, payload, apiToken) => {
  const headers = {
    "Content-Type": "application/json",
  };

  if (apiToken) {
    headers.Authorization = `Bearer ${apiToken}`;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const responseText = await response.text();
    const message = responseText ? responseText.slice(0, 200) : "";
    throw new Error(
      `Webhook error: ${response.status} ${message || response.statusText}`,
    );
  }
};

const runScrape = async () => {
  ui.outputEl.value = "";
  const { skip, limit } = readOptions();
  const limitLabel = limit > 0 ? limit : "all";
  const { webhookUrl, apiToken } = await loadSettings();

  if (!isValidWebhookUrl(webhookUrl)) {
    setStatus("Webhook URL must start with https.");
    return;
  }

  setStatus(`Scraping posts (skip ${skip}, limit ${limitLabel})...`);
  ui.scrapeButton.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) {
      setStatus("No active tab found.");
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "SCRAPE_LINKEDIN_COMMENTS",
      options: { skip, limit },
    });

    if (!response?.ok) {
      throw new Error(response?.error || "No response from content script.");
    }

    const posts = response.data || [];
    ui.outputEl.value = JSON.stringify(posts, null, 2);

    let webhookNote = "";
    if (webhookUrl) {
      setStatus(`Sending ${posts.length} posts to webhook...`);
      try {
        await sendToWebhook(
          webhookUrl,
          {
            scrapedAt: new Date().toISOString(),
            sourceUrl: tab.url || "",
            options: { skip, limit },
            count: posts.length,
            items: posts,
          },
          apiToken,
        );
        webhookNote = " Sent to webhook.";
      } catch (error) {
        console.error(error);
        webhookNote = " Webhook failed.";
      }
    }

    setStatus(`Found ${posts.length} posts.${webhookNote}`);
  } catch (error) {
    console.error(error);
    if (String(error?.message).includes("Receiving end does not exist")) {
      setStatus("Open a LinkedIn comments activity page and try again.");
    } else {
      setStatus("Scrape failed. Open LinkedIn and try again.");
    }
  } finally {
    ui.scrapeButton.disabled = false;
  }
};

ui.scrapeButton.addEventListener("click", runScrape);
