function normalizeIngredientStatement(statement) {
  return String(statement || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^ingredients?\s*[:;]\s*/i, "")
    .replace(/^label formula statement\s*:\s*/i, "")
    .replace(/^seven-up contains\s+/i, "")
    .replace(/^a beverage syrup\s*:\s*/i, "")
    .replace(/^prepared with\s+/i, "")
    .replace(/\.\s+(contains(?:\s*:)?|allergy information\s*:|vitamins? and minerals\s*:)/ig, "; $1")
    .replace(/[.;\s]+$/, "");
}

function ingredientItemsFromStatement(statement) {
  const text = normalizeIngredientStatement(statement);
  if (!text) return [];

  const items = [];
  let value = "";
  let depth = 0;
  for (const char of text) {
    if ("([{".includes(char)) depth += 1;
    else if (")]}".includes(char) && depth > 0) depth -= 1;
    if ((char === "," || char === ";") && depth === 0) {
      const item = value.trim();
      if (item) items.push(item);
      value = "";
    } else {
      value += char;
    }
  }
  const tail = value.trim();
  if (tail) items.push(tail);
  return items
    .map((item) => item.replace(/\s+/g, " ").replace(/[.;\s]+$/, "").trim())
    .filter(Boolean);
}

module.exports = {
  ingredientItemsFromStatement,
  normalizeIngredientStatement,
};
