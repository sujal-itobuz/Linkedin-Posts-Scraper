const ui = {
  webhookInput: document.getElementById("webhook-url"),
  tokenInput: document.getElementById("api-token"),
  saveButton: document.getElementById("save-btn"),
  statusEl: document.getElementById("status"),
};

const STORAGE_KEYS = {
  webhookUrl: "linkedinWebhookUrl",
  apiToken: "linkedinApiToken",
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

const loadSettings = async () => {
  const stored = await chrome.storage.sync.get([
    STORAGE_KEYS.webhookUrl,
    STORAGE_KEYS.apiToken,
  ]);

  if (typeof stored[STORAGE_KEYS.webhookUrl] === "string") {
    ui.webhookInput.value = stored[STORAGE_KEYS.webhookUrl];
  }

  if (typeof stored[STORAGE_KEYS.apiToken] === "string") {
    ui.tokenInput.value = stored[STORAGE_KEYS.apiToken];
  }
};

const saveSettings = async () => {
  const webhookUrl = ui.webhookInput.value.trim();
  const apiToken = ui.tokenInput.value.trim();

  if (!isValidWebhookUrl(webhookUrl)) {
    setStatus("Webhook URL must start with https://");
    return;
  }

  await chrome.storage.sync.set({
    [STORAGE_KEYS.webhookUrl]: webhookUrl,
    [STORAGE_KEYS.apiToken]: apiToken,
  });

  setStatus("Settings saved.");
};

ui.saveButton.addEventListener("click", saveSettings);

loadSettings().catch((error) => {
  console.error("Failed to load settings", error);
  setStatus("Failed to load settings.");
});
