import db from "./db.js";

const recipes = [
  {
    id:"tomato-egg-stir-fry", title:"Tomato and egg stir-fry", description:"A quick, comforting pan meal.", cuisine:"Everyday", prep:5, cook:10, servings:2, difficulty:"Easy",
    ingredients:[["egg","2",0],["tomato","2",0],["onion","1 small",0],["salt","to taste",1],["oil","1 tbsp",1]],
    steps:["Beat the eggs with a pinch of salt.","Heat oil and scramble the eggs until just set; remove and set aside.","Cook sliced onion until soft, add chopped tomato and simmer until saucy.","Return the eggs, toss briefly and serve."]
  },
  {
    id:"veggie-omelette", title:"Vegetable omelette", description:"An easy breakfast with vegetables.", cuisine:"Breakfast", prep:5, cook:5, servings:1, difficulty:"Easy",
    ingredients:[["egg","2",0],["onion","¼",0],["bell pepper","¼",0],["cheese","30 g",0],["salt","to taste",1],["oil","1 tsp",1]],
    steps:["Dice the onion and bell pepper.","Soften the vegetables in a little oil.","Pour in beaten, salted eggs and cook gently.","Add cheese, fold and serve."]
  },
  {
    id:"egg-fried-rice", title:"Egg fried rice", description:"A useful way to turn leftover rice into a meal.", cuisine:"Asian-inspired", prep:10, cook:10, servings:2, difficulty:"Easy",
    ingredients:[["rice","2 cups cooked",0],["egg","2",0],["onion","½",0],["carrot","1",0],["soy sauce","1 tbsp",0],["oil","1 tbsp",1]],
    steps:["Use cold cooked rice if possible.","Fry diced onion and carrot until tender.","Push vegetables aside and scramble the eggs.","Add rice and soy sauce; stir-fry until hot."]
  },
  {
    id:"tomato-pasta", title:"Tomato pasta", description:"Simple pasta with a homemade tomato sauce.", cuisine:"Italian-inspired", prep:5, cook:20, servings:2, difficulty:"Easy",
    ingredients:[["pasta","200 g",0],["tomato","3",0],["garlic","2 cloves",0],["onion","½",0],["salt","to taste",1],["oil","1 tbsp",1],["black pepper","to taste",1]],
    steps:["Boil pasta in salted water until al dente.","Fry onion and garlic in oil.","Add chopped tomatoes and simmer until thick.","Toss pasta through the sauce and season."]
  },
  {
    id:"lentil-soup", title:"Lentil soup", description:"A filling, budget-friendly bowl.", cuisine:"Everyday", prep:10, cook:30, servings:4, difficulty:"Easy",
    ingredients:[["lentil","1 cup",0],["onion","1",0],["carrot","1",0],["garlic","2 cloves",0],["tomato","2",0],["salt","to taste",1],["oil","1 tbsp",1],["water","4 cups",1]],
    steps:["Rinse the lentils.","Fry onion, carrot and garlic until soft.","Add lentils, tomato and water.","Simmer until lentils are tender, then season."]
  },
  {
    id:"chicken-rice-pot", title:"One-pot chicken and rice", description:"A satisfying one-pot family meal.", cuisine:"Everyday", prep:10, cook:35, servings:4, difficulty:"Medium",
    ingredients:[["chicken","500 g",0],["rice","2 cups",0],["onion","1",0],["garlic","2 cloves",0],["tomato","2",0],["salt","to taste",1],["oil","2 tbsp",1],["water","3 cups",1]],
    steps:["Season and brown the chicken in oil; remove temporarily.","Fry onion and garlic, then add tomato and cook down.","Add rice and water, return chicken and bring to a simmer.","Cover and cook on low until rice is tender and chicken is fully cooked."]
  },
  {
    id:"potato-omelette", title:"Potato omelette", description:"A hearty omelette for breakfast or a light supper.", cuisine:"Everyday", prep:10, cook:20, servings:3, difficulty:"Medium",
    ingredients:[["potato","2 medium",0],["egg","4",0],["onion","1",0],["salt","to taste",1],["oil","2 tbsp",1]],
    steps:["Slice potatoes and onion thinly.","Cook gently in oil until soft; drain excess oil.","Mix with beaten eggs and salt.","Cook in a pan until set underneath, flip carefully and finish cooking."]
  },
  {
    id:"potato-curry", title:"Potato curry", description:"A simple spiced potato stew.", cuisine:"Indian-inspired", prep:10, cook:25, servings:3, difficulty:"Easy",
    ingredients:[["potato","4",0],["onion","1",0],["tomato","2",0],["curry powder","1 tsp",0],["salt","to taste",1],["oil","1 tbsp",1],["water","1 cup",1]],
    steps:["Fry onion until soft.","Stir in curry powder for 30 seconds.","Add tomato, cubed potatoes and water.","Cover and simmer until potatoes are tender."]
  },
  {
    id:"chickpea-curry", title:"Chickpea coconut curry", description:"Creamy chickpeas in a gently spiced sauce.", cuisine:"Indian-inspired", prep:5, cook:25, servings:3, difficulty:"Easy",
    ingredients:[["chickpea","2 cups cooked",0],["onion","1",0],["tomato","2",0],["garlic","2 cloves",0],["coconut milk","1 cup",0],["curry powder","1 tsp",0],["salt","to taste",1],["oil","1 tbsp",1]],
    steps:["Fry onion and garlic until fragrant.","Add curry powder and stir briefly.","Add tomato, chickpeas and coconut milk.","Simmer for 15 minutes and season."]
  },
  {
    id:"ugali-sukuma", title:"Ugali with sukuma wiki", description:"A Kenyan staple served with sautéed greens.", cuisine:"Kenyan", prep:5, cook:20, servings:2, difficulty:"Easy",
    ingredients:[["maize flour","2 cups",0],["sukuma wiki","1 bunch",0],["onion","1",0],["tomato","1",0],["salt","to taste",1],["oil","1 tbsp",1],["water","as needed",1]],
    steps:["Bring water to a boil in a sufuria and add a little salt.","Gradually stir in maize flour, mixing until thick; cook while turning until firm.","Separately fry onion, add tomato, then sliced sukuma wiki.","Cook greens until tender and serve with ugali."]
  },
  {
    id:"githeri", title:"Githeri", description:"A filling Kenyan maize and bean stew.", cuisine:"Kenyan", prep:10, cook:25, servings:4, difficulty:"Easy",
    ingredients:[["maize","1 cup boiled",0],["bean","1 cup boiled",0],["potato","2",0],["carrot","1",0],["onion","1",0],["tomato","2",0],["salt","to taste",1],["oil","1 tbsp",1]],
    steps:["Heat oil and soften the onion.","Add tomato and cook into a sauce.","Add potatoes, carrot, boiled maize and beans with a little water.","Cover and simmer until vegetables are tender; season."]
  },
  {
    id:"chapati-beans", title:"Chapati with bean stew", description:"A satisfying meal using cooked beans.", cuisine:"Kenyan", prep:10, cook:20, servings:3, difficulty:"Easy",
    ingredients:[["bean","2 cups cooked",0],["chapati","3",0],["onion","1",0],["tomato","2",0],["garlic","1 clove",0],["salt","to taste",1],["oil","1 tbsp",1]],
    steps:["Fry onion and garlic until soft.","Add tomatoes and cook until saucy.","Stir in cooked beans and simmer for 10 minutes.","Warm chapatis and serve with the bean stew."]
  },
  {
    id:"banana-oat-pancakes", title:"Banana oat pancakes", description:"Naturally sweet pancakes with banana.", cuisine:"Breakfast", prep:5, cook:10, servings:2, difficulty:"Easy",
    ingredients:[["banana","1 ripe",0],["oat","1 cup",0],["egg","1",0],["oil","1 tsp",1]],
    steps:["Mash the banana.","Mix with oats and egg; rest for five minutes.","Cook small pancakes in a lightly oiled pan until golden on both sides."]
  }
];

const insertRecipe = db.prepare(`
INSERT INTO recipes (id,title,description,cuisine,prep_minutes,cook_minutes,servings,difficulty)
VALUES (@id,@title,@description,@cuisine,@prep,@cook,@servings,@difficulty)
ON CONFLICT(id) DO UPDATE SET title=excluded.title, description=excluded.description,
cuisine=excluded.cuisine, prep_minutes=excluded.prep_minutes, cook_minutes=excluded.cook_minutes,
servings=excluded.servings, difficulty=excluded.difficulty
`);
const insertIngredient = db.prepare(`
INSERT INTO ingredients(name,normalized_name,category) VALUES (?,?,?)
ON CONFLICT(normalized_name) DO NOTHING
`);
const getIngredient = db.prepare("SELECT id FROM ingredients WHERE normalized_name=?");
const insertRI = db.prepare(`
INSERT INTO recipe_ingredients(recipe_id,ingredient_id,quantity,is_optional,is_pantry_staple)
VALUES (?,?,?,?,?) ON CONFLICT(recipe_id,ingredient_id) DO UPDATE SET
quantity=excluded.quantity,is_optional=excluded.is_optional,is_pantry_staple=excluded.is_pantry_staple
`);
const clearSteps = db.prepare("DELETE FROM recipe_steps WHERE recipe_id=?");
const insertStep = db.prepare("INSERT INTO recipe_steps(recipe_id,step_number,instruction) VALUES (?,?,?)");

const categoryFor = (name) => {
  if (["egg","chicken","beef"].includes(name)) return "protein";
  if (["tomato","onion","carrot","potato","bell pepper","sukuma wiki","garlic"].includes(name)) return "vegetable";
  if (["rice","pasta","maize flour","maize","chapati","oat"].includes(name)) return "grain";
  if (["bean","lentil","chickpea"].includes(name)) return "legume";
  return "other";
};

const seedAll = db.transaction(() => {
  for (const r of recipes) {
    insertRecipe.run({id:r.id,title:r.title,description:r.description,cuisine:r.cuisine,prep:r.prep,cook:r.cook,servings:r.servings,difficulty:r.difficulty});
    db.prepare("DELETE FROM recipe_ingredients WHERE recipe_id=?").run(r.id);
    clearSteps.run(r.id);
    for (const [name, quantity, staple] of r.ingredients) {
      insertIngredient.run(name,name,categoryFor(name));
      const ingredientId = getIngredient.get(name).id;
      insertRI.run(r.id,ingredientId,quantity,0,staple);
    }
    r.steps.forEach((step,i) => insertStep.run(r.id,i+1,step));
  }

  // Demo pantry data for demo-user. Re-running seed resets this user's pantry.
  db.prepare("DELETE FROM pantry_items WHERE user_id='demo-user'").run();
  const demoItems = ["egg","tomato","onion","rice","potato","sukuma wiki","maize flour","bean","garlic"];
  const addPantry = db.prepare("INSERT INTO pantry_items(user_id,ingredient_id,quantity) VALUES ('demo-user',?,'demo stock')");
  for (const name of demoItems) {
    const row = getIngredient.get(name);
    if (row) addPantry.run(row.id);
  }
});
seedAll();
console.log(`Seeded ${recipes.length} recipes and demo pantry items.`);
db.close();
