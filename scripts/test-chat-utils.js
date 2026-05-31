const assert = require("assert");
const chat = require("../docs/chat-utils");

const menus = {
  menus: [
    {
      uid: "nypl:1",
      id: "nypl:1",
      title: "Daily Dinner Menu",
      date: "1912-04-10",
      year: 1912,
      restaurant: "Test House",
      city: "New York",
      state: "New York",
      country: "United States",
      sourceKey: "nypl",
      sourceShortLabel: "NYPL",
      topDishes: ["Beef stew with carrots and potatoes"],
      types: ["Dinner"],
      itemUrl: "https://example.test/1",
    },
    {
      uid: "nypl:2",
      id: "nypl:2",
      title: "Supper Menu",
      date: "1913-05-12",
      year: 1913,
      restaurant: "Test Grill",
      city: "New York",
      state: "New York",
      country: "United States",
      sourceKey: "nypl",
      sourceShortLabel: "NYPL",
      topDishes: ["Beef stew with mushrooms, carrots and potatoes"],
      types: ["Supper"],
      itemUrl: "https://example.test/2",
    },
    {
      uid: "nypl:4",
      id: "nypl:4",
      title: "Test House, menu",
      date: "1912-04-10",
      year: 1912,
      restaurant: "Test House",
      city: "New York",
      state: "New York",
      country: "United States",
      sourceKey: "nypl",
      sourceShortLabel: "NYPL",
      topDishes: ["Beef stew with carrots and potatoes"],
      types: ["Menu"],
      itemUrl: "https://example.test/1",
    },
    {
      uid: "nypl:3",
      id: "nypl:3",
      title: "Seafood Dinner",
      date: "1910-01-01",
      year: 1910,
      restaurant: "Harbor Room",
      city: "Boston",
      state: "Massachusetts",
      country: "United States",
      sourceKey: "nypl",
      sourceShortLabel: "NYPL",
      topDishes: ["Broiled lobster"],
      types: ["Dinner"],
      itemUrl: "https://example.test/3",
    },
  ],
};

const prices = {
  records: [
    {
      menuId: "nypl:1",
      menuUid: "nypl:1",
      sourceKey: "nypl",
      item: "Beef stew with carrots and potatoes",
      rawLine: "Beef stew with carrots and potatoes 0.50",
      rawPrice: "0.50",
      amount: 0.5,
      currency: "USD",
      year: 1912,
      place: "New York",
      country: "United States",
      confidence: "high",
    },
    {
      menuId: "nypl:3",
      menuUid: "nypl:3",
      sourceKey: "nypl",
      item: "Broiled lobster",
      rawLine: "Broiled lobster 1.25",
      rawPrice: "1.25",
      amount: 1.25,
      currency: "USD",
      year: 1910,
      place: "Boston",
      country: "United States",
      confidence: "high",
    },
  ],
};

const parsed = chat.parseQuestion("Are there beef/steak dishes without mushrooms that are a stew with carrots and potatoes?");
assert(parsed.requiredGroups.includes("beef"), "beef/steak should be required");
assert(parsed.requiredGroups.includes("stew"), "stew should be required");
assert(parsed.requiredGroups.includes("carrot"), "carrots should be required");
assert(parsed.requiredGroups.includes("potato"), "potatoes should be required");
assert(parsed.excludedGroups.includes("mushroom"), "mushrooms should be excluded");

const answer = chat.answerQuestion({
  question: "Are there beef/steak dishes without mushrooms that are a stew with carrots and potatoes?",
  menus,
  prices,
});
assert(answer.matches.length >= 1, "expected at least one exact match");
assert(answer.matches.some((match) => match.uid === "nypl:1"), "expected clean beef stew match");
assert(!answer.matches.some((match) => match.uid === "nypl:2"), "mushroom match should be excluded");
assert(answer.matches.filter((match) => /beef stew with carrots and potatoes/i.test(match.item || "")).length === 1, "duplicate dish rows should collapse");
assert(answer.matches.some((match) => Number(match.duplicateCount || 0) > 1), "collapsed duplicate count should be retained");
assert(answer.facets?.timeline?.length, "answer should include timeline facets");

const priceAnswer = chat.answerQuestion({
  question: "lobster prices in Boston before 1920",
  menus,
  prices,
});
assert(priceAnswer.matches.some((match) => match.uid === "nypl:3" && match.kind === "price"), "expected lobster price match");

console.log("chat-utils tests passed");
