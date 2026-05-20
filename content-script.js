let lastResults = [];
let lastStatus = "Idle.";
let isRunning = false;

const toNonNegativeInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const extractJoinedText = (ltrElement) => {
  const parts = [];

  ltrElement.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.textContent || "");
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.tagName === "BR") {
        parts.push("\n");
      } else {
        parts.push(node.textContent || "");
      }
    }
  });

  return parts
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const buildEntries = () => {
  const seen = new Set();
  const items = [];

  document.querySelectorAll("[data-urn]").forEach((element) => {
    const dataUrnValue = element.dataset.urn;
    if (!dataUrnValue || seen.has(dataUrnValue)) {
      return;
    }

    const ltrElement = element.querySelector("span.break-words span[dir=ltr]");
    const images = element.querySelectorAll("img[src*='feedshare']");

    const profileElement = element.querySelector(
      ".update-components-actor__meta-link",
    );
    const profileUrl = profileElement?.href;
    const profileName = profileElement
      .querySelector("span[dir='ltr'] span")
      ?.textContent?.trim();
    const description = element
      .querySelector(".update-components-actor__description")
      .textContent?.trim();
    const relativeTime = element
      .querySelector(".update-components-actor__sub-description span")
      ?.textContent?.trim()
      .split(" ")[0];

    const joinedPost = extractJoinedText(ltrElement);
    if (!joinedPost) {
      return;
    }

    seen.add(dataUrnValue);
    items.push({
      url: `https://www.linkedin.com/feed/update/${dataUrnValue}`,
      post: joinedPost,
      images: Array.from(images).map((img) => img.src),
      profileUrl: profileUrl,
      profileName: profileName,
      description: description,
      relativeTime: relativeTime,
    });
  });

  return items;
};

const scrollToEndUntilStable = async (stopAt) => {
  let lastHeight = document.documentElement.scrollHeight;
  let stableTicks = 0;
  const maxIterations = 30;
  let latestItems = [];

  for (let i = 0; i < maxIterations; i += 1) {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });

    await delay(1200);
    latestItems = buildEntries();

    if (latestItems.length >= stopAt) {
      return latestItems;
    }

    const newHeight = document.documentElement.scrollHeight;

    if (newHeight <= lastHeight + 5) {
      stableTicks += 1;
    } else {
      stableTicks = 0;
    }

    lastHeight = newHeight;

    if (stableTicks >= 3) {
      break;
    }
  }

  return latestItems;
};

const scrapeLinkedInComments = async (options) => {
  const skip = toNonNegativeInt(options?.skip);
  const limitRaw = toNonNegativeInt(options?.limit);
  const limit = limitRaw > 0 ? limitRaw : Number.POSITIVE_INFINITY;
  const stopAt = Number.isFinite(limit)
    ? skip + limit
    : Number.POSITIVE_INFINITY;

  const allItems = await scrollToEndUntilStable(stopAt);
  const start = Math.min(skip, allItems.length);
  const end = Number.isFinite(limit)
    ? Math.min(allItems.length, start + limit)
    : allItems.length;

  return allItems.slice(start, end);
};

const runScrape = async (options, sourceLabel) => {
  if (isRunning) {
    return lastResults;
  }

  isRunning = true;
  lastStatus = `Scraping ${sourceLabel || "content script"}...`;

  try {
    const results = await scrapeLinkedInComments(options);
    lastResults = results;
    lastStatus = `Found ${results.length} posts.`;
    return results;
  } catch (error) {
    console.error("LinkedIn scrape failed", error);
    lastStatus = "Scrape failed.";
    throw error;
  } finally {
    isRunning = false;
  }
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "SCRAPE_LINKEDIN_COMMENTS") {
    runScrape(message.options, "popup")
      .then((data) => {
        sendResponse({ ok: true, data, status: lastStatus });
      })
      .catch((error) => {
        sendResponse({
          ok: false,
          error: error?.message || "Scrape failed.",
          status: lastStatus,
        });
      });
    return true;
  }

  if (message?.type === "GET_LINKEDIN_RESULTS") {
    sendResponse({
      ok: true,
      data: lastResults,
      status: lastStatus,
      running: isRunning,
    });
  }

  return false;
});
