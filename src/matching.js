
function normalizeIngredient(name) {
  return name.trim().toLowerCase();
}

export function matchRecipes(recipes, pantry) {
  const available = new Set(
    pantry.map(normalizeIngredient)
  );

  return recipes.map(recipe => {
    const required = recipe.ingredients.map(
      normalizeIngredient
    );

    const matched = required.filter(
      ingredient => available.has(ingredient)
    );

    const missing = required.filter(
      ingredient => !available.has(ingredient)
    );

    const score = required.length
      ? Math.round((matched.length / required.length) * 100)
      : 0;

    return {
      ...recipe,
      matchScore: score,
      matchedIngredients: matched,
      missingIngredients: missing
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
}

