const scrapeButton = document.getElementById("scrape-btn");
const statusEl = document.getElementById("status");
const outputEl = document.getElementById("output");

const setStatus = (message) => {
  statusEl.textContent = message;
};

const runScrape = async () => {
  outputEl.value = "";
  setStatus("Scraping posts...");
  scrapeButton.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab || !tab.id) {
      setStatus("No active tab found.");
      return;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeLinkedInPosts,
    });

    const posts = results?.[0]?.result || [];
    outputEl.value = JSON.stringify(posts, null, 2);
    setStatus(`Found ${posts.length} posts.`);
  } catch (error) {
    console.error(error);
    setStatus("Scrape failed. Open LinkedIn feed and try again.");
  } finally {
    scrapeButton.disabled = false;
  }
};

scrapeButton.addEventListener("click", runScrape);

function scrapeLinkedInPosts() {
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const scrollToEndUntilStable = async () => {
    let lastHeight = document.documentElement.scrollHeight;
    let stableTicks = 0;
    const maxIterations = 30;

    for (let i = 0; i < maxIterations; i += 1) {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "smooth",
      });

      await delay(1200);
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
  };

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

  const buildPosts = () => {
    const seen = new Set();
    const items = [];

    document.querySelectorAll("[data-urn]").forEach((element) => {
      const dataUrnValue = element.dataset.urn;
      console.log("Found element with data-urn:", dataUrnValue);
      if (!dataUrnValue || seen.has(dataUrnValue)) {
        return;
      }

      const ltrElement = element.querySelector(
        "span.break-words span[dir=ltr]",
      );
      if (!ltrElement) {
        return;
      }

      const joinedPost = extractJoinedText(ltrElement);
      if (!joinedPost) {
        return;
      }

      seen.add(dataUrnValue);
      items.push({
        url: `https://www.linkedin.com/feed/update/${dataUrnValue}`,
        post: joinedPost,
      });
    });

    return items;
  };

  return (async () => {
    await scrollToEndUntilStable();
    return buildPosts();
  })();
}
