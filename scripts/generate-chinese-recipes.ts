/**
 * Generate 3 popular Chinese meal prep recipes, upsert to Supabase,
 * then generate AI food images via fal.ai and update image_url.
 *
 * Usage:
 *   npx tsx scripts/generate-chinese-recipes.ts
 *
 * Requires in .env.local: SUPABASE_URL, SUPABASE_ANON_KEY, FAL_KEY
 */

import * as path from "path";
import * as dotenv from "dotenv";
import { fal } from "@fal-ai/client";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const falKey = process.env.FAL_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}
if (!falKey) {
  console.error("Missing FAL_KEY in .env.local");
  process.exit(1);
}

fal.config({ credentials: falKey });
const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET = "recipe-images";
const MODEL = "fal-ai/recraft-v3";
const FORCE_REGENERATE_IDS = new Set([9000013, 9000014, 9000015, 9000016, 9000017]);

// ─── Recipe data ─────────────────────────────────────────────────────────────

const CHINESE_RECIPES = [
  {
    id: 9000001,
    title: "红烧肉 (Red Braised Pork Belly)",
    minutes: 55,
    servings: 4,
    calories: 520,
    n_steps: 7,
    tags: ["chinese", "main-course", "pork", "meal-prep", "braise"],
    ingredients: [
      { name: "五花肉（切3厘米方块）", amount: 500, unit: "克" },
      { name: "生抽", amount: 3, unit: "汤匙" },
      { name: "老抽", amount: 1, unit: "汤匙" },
      { name: "绍兴料酒", amount: 2, unit: "汤匙" },
      { name: "冰糖", amount: 30, unit: "克" },
      { name: "姜片", amount: 3, unit: "片" },
      { name: "葱段", amount: 2, unit: "根" },
      { name: "八角", amount: 2, unit: "个" },
      { name: "清水", amount: 300, unit: "毫升" },
    ],
    steps: [
      { number: 1, step: "五花肉冷水下锅，大火煮沸后继续焯水5分钟，捞出冲冷水洗净备用。" },
      { number: 2, step: "锅中开中小火，放入冰糖慢慢炒至琥珀色焦糖。" },
      { number: 3, step: "放入五花肉翻炒，让肉均匀裹上焦糖色，约2分钟。" },
      { number: 4, step: "加入生抽、老抽、绍兴料酒、姜片、葱段和八角，翻炒均匀。" },
      { number: 5, step: "倒入清水（刚好没过猪肉），大火煮沸。" },
      { number: 6, step: "转小火，盖盖焖煮35-40分钟，直至猪肉软烂入味。" },
      { number: 7, step: "开盖转大火收汁，至汤汁浓稠发亮即可，搭配白米饭享用。" },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: {
      level: "good",
      label: "Reheats Well",
      tip: "盖上保鲜膜，微波加热2分钟，中途翻拌一次。汤汁可保持猪肉湿润。",
    },
    score: 0.82,
    imagePrompt:
      'Subject: "红烧肉 Red Braised Pork Belly" (Chinese style braise), featuring glazed pork belly cubes with star anise, ginger, rich dark soy glaze, served with white steamed rice. Style: Cinematic food photography, gourmet, professional, realistic. Angle: 45-degree close-up. Lighting: Warm natural light, rich deep caramel tones. Props: Dark ceramic bowl on rustic wood. Background: Dark wood surface, minimal.',
  },
  {
    id: 9000002,
    title: "番茄炒蛋 (Tomato and Egg Stir Fry)",
    minutes: 15,
    servings: 2,
    calories: 200,
    n_steps: 6,
    tags: ["chinese", "main-course", "eggs", "vegetarian", "stir-fry", "easy", "quick"],
    ingredients: [
      { name: "鸡蛋", amount: 3, unit: "个" },
      { name: "西红柿（切块）", amount: 2, unit: "个" },
      { name: "食用油", amount: 2, unit: "汤匙" },
      { name: "盐", amount: 0.5, unit: "茶匙" },
      { name: "白糖", amount: 1, unit: "茶匙" },
      { name: "葱花", amount: 1, unit: "根" },
      { name: "香油", amount: 0.5, unit: "茶匙" },
    ],
    steps: [
      { number: 1, step: "鸡蛋打散，加少许盐和几滴香油，搅拌均匀备用。" },
      { number: 2, step: "热锅加1汤匙油，大火倒入蛋液，快速翻炒至刚刚凝固成嫩滑蛋块，盛出备用。" },
      { number: 3, step: "锅中再加剩余食用油，放入葱花大火爆香约30秒。" },
      { number: 4, step: "放入西红柿块，大火翻炒2分钟至出汁软化。" },
      { number: 5, step: "加盐和白糖调味，倒入炒好的鸡蛋翻炒均匀。" },
      { number: 6, step: "淋入剩余香油，出锅，搭配白米饭享用。" },
    ],
    fridge_life: { days: "3-4", label: "3-4 Days" },
    microwave_score: {
      level: "good",
      label: "Reheats Well",
      tip: "盖上保鲜膜，微波加热1-1.5分钟，中途翻拌一次。建议3天内食用。",
    },
    score: 0.85,
    imagePrompt:
      'Subject: "番茄炒蛋 Tomato and Egg Stir Fry" (Chinese home-style), featuring bright red tomato wedges and fluffy scrambled egg pieces in a glossy sauce, garnished with green onion, served in a white bowl over rice. Style: Cinematic food photography, vibrant, fresh, home-cooked feel. Angle: 45-degree close-up. Lighting: Bright natural daylight, vibrant red and yellow tones. Props: White ceramic bowl on white marble. Background: Light marble surface, clean.',
  },
  {
    id: 9000003,
    title: "麻婆豆腐 (Mapo Tofu)",
    minutes: 25,
    servings: 3,
    calories: 280,
    n_steps: 7,
    tags: ["chinese", "main-course", "tofu", "spicy", "sichuan", "meal-prep"],
    ingredients: [
      { name: "嫩豆腐（切2厘米方块）", amount: 400, unit: "克" },
      { name: "猪肉末", amount: 100, unit: "克" },
      { name: "郫县豆瓣酱", amount: 1.5, unit: "汤匙" },
      { name: "大蒜（切末）", amount: 3, unit: "瓣" },
      { name: "鲜姜（切末）", amount: 1, unit: "茶匙" },
      { name: "生抽", amount: 1, unit: "汤匙" },
      { name: "高汤", amount: 150, unit: "毫升" },
      { name: "淀粉（加2汤匙水调成水淀粉）", amount: 1, unit: "汤匙" },
      { name: "花椒粉", amount: 0.5, unit: "茶匙" },
      { name: "葱花", amount: 2, unit: "根" },
      { name: "食用油", amount: 2, unit: "汤匙" },
    ],
    steps: [
      { number: 1, step: "豆腐切块后放入加盐的热水中轻轻焯水3分钟，捞出沥干备用。" },
      { number: 2, step: "锅中热油，大火将猪肉末炒散炒香至变色。" },
      { number: 3, step: "加入郫县豆瓣酱翻炒1分钟，炒出红油。" },
      { number: 4, step: "放入蒜末和姜末，翻炒约30秒至出香味。" },
      { number: 5, step: "倒入高汤和生抽，轻轻放入豆腐，中小火慢慢炖煮2-3分钟。" },
      { number: 6, step: "缓缓淋入水淀粉，轻轻推动锅铲让汤汁慢慢收浓至挂汁。" },
      { number: 7, step: "出锅前撒花椒粉和葱花，趁热搭配白米饭上桌。" },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: {
      level: "good",
      label: "Reheats Well",
      tip: "盖上保鲜膜，微波加热1.5-2分钟。若汤汁过于浓稠，可加少量水稀释。",
    },
    score: 0.80,
    imagePrompt:
      'Subject: "麻婆豆腐 Mapo Tofu" (Sichuan Chinese style), featuring silky soft tofu cubes in deep red spicy chilli bean sauce with ground pork, garnished with Sichuan peppercorn and green onion. Style: Cinematic food photography, rich deep colours. Angle: 45-degree close-up. Lighting: Warm dramatic lighting, deep red and orange tones. Props: Traditional dark clay pot or black ceramic bowl. Background: Dark slate surface, minimal.',
  },
  {
    id: 9000004,
    title: "口水鸡 (Sichuan Saliva Chicken)",
    minutes: 40,
    servings: 3,
    calories: 320,
    n_steps: 6,
    tags: ["chinese", "cold-dish", "chicken", "sichuan", "meal-prep", "spicy"],
    ingredients: [
      { name: "鸡腿", amount: 2, unit: "个（约500克）" },
      { name: "黄瓜（切细丝）", amount: 1, unit: "根" },
      { name: "葱段", amount: 2, unit: "根" },
      { name: "姜片", amount: 3, unit: "片" },
      { name: "绍兴料酒", amount: 1, unit: "汤匙" },
      { name: "花生碎", amount: 30, unit: "克" },
      { name: "白芝麻", amount: 1, unit: "汤匙" },
      { name: "郫县豆瓣酱", amount: 1, unit: "汤匙" },
      { name: "生抽", amount: 2, unit: "汤匙" },
      { name: "香醋", amount: 1, unit: "汤匙" },
      { name: "芝麻酱", amount: 1, unit: "汤匙" },
      { name: "蒜末", amount: 4, unit: "瓣" },
      { name: "白糖", amount: 1, unit: "茶匙" },
      { name: "辣椒油", amount: 1, unit: "汤匙" },
      { name: "花椒油", amount: 1, unit: "茶匙" },
      { name: "香油", amount: 1, unit: "茶匙" },
    ],
    steps: [
      { number: 1, step: "鸡腿冷水下锅，加葱段、姜片、料酒，大火煮开后转小火煮15分钟至熟透。" },
      { number: 2, step: "捞出鸡腿立即放入冰水中浸泡10分钟，让鸡皮紧致爽脆。" },
      { number: 3, step: "将郫县豆瓣酱、生抽、香醋、芝麻酱、蒜末、白糖、辣椒油、花椒油和香油混合搅拌均匀，制成口水鸡红油酱汁。" },
      { number: 4, step: "鸡腿从冰水中取出，去骨后顺纹路手撕成条状，铺放在黄瓜丝上。" },
      { number: 5, step: "将红油酱汁均匀淋在鸡肉上，撒上花生碎和白芝麻。" },
      { number: 6, step: "拌匀后即可食用，或放入冰箱腌制30分钟后风味更佳。" },
    ],
    fridge_life: { days: "3", label: "3 Days" },
    microwave_score: {
      level: "cold",
      label: "Serve Cold",
      tip: "此菜适合冷食，从冰箱取出后在室温回温10分钟，拌匀即可享用，无需加热。",
    },
    score: 0.88,
    imagePrompt:
      'Chinese Sichuan cold chicken salad: hand-torn poached chicken pieces drenched in glossy crimson chili oil sauce made with doubanjiang and sesame paste, arranged on a bed of fine cucumber julienne, topped with crushed roasted peanuts, toasted white sesame seeds, and sliced green onion. Vivid red and green contrast. White ceramic plate. Cinematic food photography, 45-degree close-up, bright natural daylight, realistic.',
  },
  {
    id: 9000005,
    title: "卤牛腱 (Spiced Braised Beef Shank)",
    minutes: 100,
    servings: 6,
    calories: 280,
    n_steps: 6,
    tags: ["chinese", "beef", "braised", "meal-prep", "main-course"],
    ingredients: [
      { name: "牛腱子", amount: 800, unit: "克" },
      { name: "生抽", amount: 3, unit: "汤匙" },
      { name: "老抽", amount: 2, unit: "汤匙" },
      { name: "绍兴料酒", amount: 3, unit: "汤匙" },
      { name: "冰糖", amount: 20, unit: "克" },
      { name: "八角", amount: 3, unit: "个" },
      { name: "桂皮", amount: 1, unit: "块（约5厘米）" },
      { name: "香叶", amount: 3, unit: "片" },
      { name: "干辣椒", amount: 3, unit: "个" },
      { name: "花椒", amount: 1, unit: "茶匙" },
      { name: "葱段", amount: 3, unit: "根" },
      { name: "姜片", amount: 5, unit: "片" },
    ],
    steps: [
      { number: 1, step: "牛腱子冷水下锅焯水，加料酒，大火煮沸后焯5分钟，捞出洗净切大块。" },
      { number: 2, step: "锅中加足量清水（没过牛腱），放入八角、桂皮、香叶、干辣椒和花椒。" },
      { number: 3, step: "加入生抽、老抽、料酒、冰糖、葱段和姜片，大火煮沸。" },
      { number: 4, step: "放入牛腱子，转小火盖盖卤煮60-70分钟，用筷子能轻松插入即为熟透。" },
      { number: 5, step: "关火后让牛腱继续浸泡在卤汁中冷却至少1小时，充分吸收味道。" },
      { number: 6, step: "取出放冰箱冷藏后切薄片，淋少许卤汁和香油，撒葱花即可上桌。" },
    ],
    fridge_life: { days: "5", label: "5 Days" },
    microwave_score: {
      level: "good",
      label: "Reheats Well",
      tip: "切片后盖保鲜膜微波加热1-1.5分钟，或直接淋上卤汁冷食，风味更佳。",
    },
    score: 0.85,
    imagePrompt:
      'Chinese spiced braised beef shank: thinly sliced braised beef tendons arranged in overlapping fan pattern on a white ceramic plate, deep mahogany and dark brown color with a glossy brine sheen from soy sauce, star anise, cinnamon and bay leaf braise, garnished with chopped green onion and a drizzle of dark soy reduction. Elegant plating. Cinematic food photography, 45-degree close-up, warm side lighting, realistic.',
  },
  {
    id: 9000006,
    title: "可乐鸡翅 (Cola Braised Chicken Wings)",
    minutes: 30,
    servings: 3,
    calories: 380,
    n_steps: 6,
    tags: ["chinese", "chicken", "wings", "braised", "meal-prep", "easy"],
    ingredients: [
      { name: "鸡翅中", amount: 500, unit: "克（约10个）" },
      { name: "可乐", amount: 330, unit: "毫升（1罐）" },
      { name: "生抽", amount: 2, unit: "汤匙" },
      { name: "老抽", amount: 1, unit: "汤匙" },
      { name: "绍兴料酒", amount: 1, unit: "汤匙" },
      { name: "姜片", amount: 3, unit: "片" },
      { name: "葱段", amount: 2, unit: "根" },
      { name: "食用油", amount: 1, unit: "汤匙" },
    ],
    steps: [
      { number: 1, step: "鸡翅两面各划两刀，放入冷水中浸泡10分钟去血水，捞出擦干水分。" },
      { number: 2, step: "锅中热油，中火将鸡翅两面各煎3-4分钟至金黄。" },
      { number: 3, step: "加入姜片和葱段翻炒出香味，淋入料酒、生抽和老抽，翻炒上色。" },
      { number: 4, step: "倒入可乐（刚好没过鸡翅），大火煮沸后转中小火慢炖15分钟。" },
      { number: 5, step: "开盖转大火收汁，不断翻动鸡翅，至汤汁浓稠发亮均匀裹住鸡翅。" },
      { number: 6, step: "出锅前撒葱花点缀，搭配白米饭享用。" },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: {
      level: "good",
      label: "Reheats Well",
      tip: "盖保鲜膜，微波加热1.5-2分钟，中途翻一次。汤汁可保持鸡翅湿润不柴。",
    },
    score: 0.87,
    imagePrompt:
      'Chinese cola braised chicken wings: about 8 glossy chicken mid-wings coated in thick sticky caramel amber glaze reduced from cola, dark soy sauce and ginger, deep burnished brown with a lacquered sheen, garnished with sliced green onion, served in a dark ceramic casserole on a rustic wooden surface. Rich and indulgent. Cinematic food photography, 45-degree close-up, warm dramatic lighting, realistic.',
  },
  {
    id: 9000007,
    title: "蜜汁叉烧 (Cantonese Honey Char Siu)",
    minutes: 90,
    servings: 4,
    calories: 420,
    n_steps: 6,
    tags: ["chinese", "pork", "cantonese", "roasted", "meal-prep", "main-course"],
    ingredients: [
      { name: "猪梅花肉（切厚片）", amount: 600, unit: "克" },
      { name: "蚝油", amount: 2, unit: "汤匙" },
      { name: "生抽", amount: 2, unit: "汤匙" },
      { name: "老抽", amount: 1, unit: "汤匙" },
      { name: "蜂蜜", amount: 3, unit: "汤匙" },
      { name: "白糖", amount: 2, unit: "汤匙" },
      { name: "绍兴料酒", amount: 1, unit: "汤匙" },
      { name: "南乳（红腐乳）", amount: 1, unit: "块（约20克）" },
      { name: "五香粉", amount: 0.5, unit: "茶匙" },
      { name: "蒜末", amount: 3, unit: "瓣" },
    ],
    steps: [
      { number: 1, step: "猪梅花肉切约2-3厘米厚片，与蚝油、生抽、老抽、1汤匙蜂蜜、白糖、料酒、南乳、五香粉、蒜末混合拌匀，密封冷藏腌制至少4小时（最好过夜）。" },
      { number: 2, step: "烤箱预热至200°C，烤网铺锡纸，放上腌好的肉片，下层放烤盘接滴落的汁液。" },
      { number: 3, step: "烤20分钟后取出，用毛刷在肉片表面刷上一层蜂蜜，翻面再刷一层。" },
      { number: 4, step: "调至220°C，继续烤10-15分钟，至边缘焦香微糊，颜色红亮诱人。" },
      { number: 5, step: "取出静置5分钟，让肉汁回流，切成薄片。" },
      { number: 6, step: "刷上剩余蜂蜜，搭配白米饭享用，或夹入叉烧包、米粉中。" },
    ],
    fridge_life: { days: "5", label: "5 Days" },
    microwave_score: {
      level: "good",
      label: "Reheats Well",
      tip: "切片后盖保鲜膜，微波加热1-1.5分钟，或放入平底锅中小火回热至边缘微焦，风味更佳。",
    },
    score: 0.90,
  },
  {
    id: 9000008,
    title: "台式卤肉饭 (Taiwanese Braised Pork Rice)",
    minutes: 65,
    servings: 6,
    calories: 480,
    n_steps: 6,
    tags: ["chinese", "taiwanese", "pork", "braised", "meal-prep", "main-course"],
    ingredients: [
      { name: "五花肉（切细丁）", amount: 500, unit: "克" },
      { name: "红葱头（切薄片）", amount: 100, unit: "克（约8-10个）" },
      { name: "酱油", amount: 4, unit: "汤匙" },
      { name: "老抽", amount: 1, unit: "汤匙" },
      { name: "米酒", amount: 2, unit: "汤匙" },
      { name: "冰糖", amount: 20, unit: "克" },
      { name: "八角", amount: 2, unit: "个" },
      { name: "五香粉", amount: 0.5, unit: "茶匙" },
      { name: "水煮蛋", amount: 4, unit: "个" },
      { name: "食用油", amount: 2, unit: "汤匙" },
      { name: "清水", amount: 300, unit: "毫升" },
    ],
    steps: [
      { number: 1, step: "五花肉切成约0.5厘米小丁，红葱头切薄片备用。" },
      { number: 2, step: "锅中热油，中火将红葱头炸至金黄焦香（约8分钟），捞出沥油备用，炸油留锅中。" },
      { number: 3, step: "同一锅大火，放入五花肉丁翻炒5-6分钟，炒出猪油至肉变色微焦。" },
      { number: 4, step: "加入炸红葱头、酱油、老抽、米酒、冰糖、八角、五香粉翻炒均匀。" },
      { number: 5, step: "倒入清水（没过肉），放入去壳水煮蛋，大火煮沸后转小火炖40分钟至汤汁浓稠。" },
      { number: 6, step: "卤肉汁淋在白米饭上，摆上对半切开的卤蛋和烫青菜，即可享用。" },
    ],
    fridge_life: { days: "5", label: "5 Days" },
    microwave_score: {
      level: "good",
      label: "Reheats Well",
      tip: "卤肉和汤汁盖保鲜膜微波加热2分钟，中途搅拌一次。米饭单独加热，组合后淋汁即可。",
    },
    score: 0.91,
  },
  {
    id: 9000009,
    title: "咖喱牛腩 (Hong Kong Style Curry Beef Brisket)",
    minutes: 95,
    servings: 4,
    calories: 420,
    n_steps: 6,
    tags: ["chinese", "cantonese", "beef", "curry", "braised", "meal-prep", "main-course"],
    ingredients: [
      { name: "牛腩（切3厘米方块）", amount: 600, unit: "克" },
      { name: "土豆（去皮切滚刀块）", amount: 300, unit: "克（约2个）" },
      { name: "洋葱（切块）", amount: 1, unit: "个" },
      { name: "港式咖喱块", amount: 40, unit: "克（约2-3块）" },
      { name: "椰浆", amount: 200, unit: "毫升" },
      { name: "生姜", amount: 3, unit: "片" },
      { name: "大蒜", amount: 3, unit: "瓣" },
      { name: "绍兴料酒", amount: 2, unit: "汤匙" },
      { name: "食用油", amount: 2, unit: "汤匙" },
      { name: "清水", amount: 600, unit: "毫升" },
    ],
    steps: [
      { number: 1, step: "牛腩冷水下锅焯水，加料酒，大火煮沸5分钟后捞出洗净，切成约3厘米方块。" },
      { number: 2, step: "锅中热油，大火炒香姜片和蒜瓣，加入洋葱翻炒至半透明，约3分钟。" },
      { number: 3, step: "放入牛腩翻炒2-3分钟，倒入清水和椰浆，大火煮沸。" },
      { number: 4, step: "转小火盖盖炖煮50分钟，至牛腩用筷子能轻松插入。" },
      { number: 5, step: "加入土豆块，继续炖15分钟至土豆软烂。" },
      { number: 6, step: "放入咖喱块搅拌至完全融化，大火收汁3-5分钟至汤汁浓稠，搭配白米饭享用。" },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: {
      level: "good",
      label: "Reheats Well",
      tip: "盖保鲜膜微波加热2-3分钟，中途搅拌一次。隔夜后咖喱味更浓郁，风味更佳。",
    },
    score: 0.88,
  },
  {
    id: 9000010,
    title: "酸汤肥牛 (Sour Broth Wagyu Beef)",
    minutes: 25,
    servings: 3,
    calories: 310,
    n_steps: 6,
    tags: ["chinese", "beef", "soup", "sour", "spicy", "meal-prep", "quick"],
    ingredients: [
      { name: "肥牛片", amount: 300, unit: "克" },
      { name: "金针菇", amount: 200, unit: "克" },
      { name: "番茄（切块）", amount: 2, unit: "个" },
      { name: "泡酸菜（切丝）", amount: 100, unit: "克" },
      { name: "小米辣", amount: 3, unit: "个" },
      { name: "大蒜（切末）", amount: 3, unit: "瓣" },
      { name: "泡椒水", amount: 2, unit: "汤匙" },
      { name: "鸡汤（或清水）", amount: 600, unit: "毫升" },
      { name: "生抽", amount: 1, unit: "汤匙" },
      { name: "盐", amount: 0.5, unit: "茶匙" },
      { name: "白胡椒粉", amount: 0.25, unit: "茶匙" },
      { name: "食用油", amount: 1, unit: "汤匙" },
      { name: "葱花", amount: 1, unit: "根" },
    ],
    steps: [
      { number: 1, step: "金针菇去根洗净撕散，番茄切块，泡酸菜切细丝，大蒜和小米辣切末备用。" },
      { number: 2, step: "锅中热油，大火炒香蒜末和小米辣，加入泡酸菜翻炒出香味，约2分钟。" },
      { number: 3, step: "加入番茄块大火翻炒2分钟至出汁软化，倒入鸡汤和泡椒水，大火煮沸。" },
      { number: 4, step: "加入金针菇，中火煮3分钟，加入生抽、盐和白胡椒粉调味。" },
      { number: 5, step: "将肥牛片逐片铺入汤中，用筷子拨散，涮煮至变色（约30-40秒），立即关火。" },
      { number: 6, step: "盛入碗中，撒葱花点缀，趁热享用，酸爽开胃。" },
    ],
    fridge_life: { days: "2", label: "2 Days" },
    microwave_score: {
      level: "ok",
      label: "Reheat Gently",
      tip: "汤底可提前备好冷藏，食用前加热汤底至沸腾，再下入新鲜肥牛片涮熟即可，肉质最嫩。",
    },
    score: 0.86,
  },
  {
    id: 9000011,
    title: "新疆大盘鸡 (Xinjiang Big Plate Chicken)",
    minutes: 65,
    servings: 4,
    calories: 490,
    n_steps: 6,
    tags: ["chinese", "xinjiang", "chicken", "spicy", "braised", "meal-prep", "main-course"],
    ingredients: [
      { name: "整鸡（斩件）", amount: 1200, unit: "克（约1只）" },
      { name: "土豆（去皮切滚刀块）", amount: 300, unit: "克（约2个）" },
      { name: "青红椒（切块）", amount: 2, unit: "个" },
      { name: "洋葱（切块）", amount: 1, unit: "个" },
      { name: "干辣椒", amount: 5, unit: "个" },
      { name: "花椒", amount: 1, unit: "茶匙" },
      { name: "八角", amount: 2, unit: "个" },
      { name: "郫县豆瓣酱", amount: 1, unit: "汤匙" },
      { name: "生抽", amount: 3, unit: "汤匙" },
      { name: "老抽", amount: 1, unit: "汤匙" },
      { name: "绍兴料酒", amount: 2, unit: "汤匙" },
      { name: "冰糖", amount: 20, unit: "克" },
      { name: "大蒜", amount: 5, unit: "瓣" },
      { name: "姜片", amount: 4, unit: "片" },
      { name: "食用油", amount: 3, unit: "汤匙" },
      { name: "清水", amount: 300, unit: "毫升" },
    ],
    steps: [
      { number: 1, step: "鸡块冷水下锅焯水，加料酒，大火煮沸3分钟后捞出洗净沥干。" },
      { number: 2, step: "锅中热油，放干辣椒、花椒和八角大火爆香10秒，加入鸡块翻炒5分钟至表面金黄。" },
      { number: 3, step: "加入姜片、蒜瓣和豆瓣酱翻炒出红油，加生抽、老抽、冰糖炒匀上色。" },
      { number: 4, step: "倒入清水（刚好没过鸡块），大火煮沸后加入土豆，转中小火盖盖炖煮25分钟。" },
      { number: 5, step: "加入洋葱和青红椒，大火收汁5分钟，汤汁浓郁裹住鸡块即可。" },
      { number: 6, step: "出锅前撒葱花，搭配宽扯面或白米饭，将汤汁拌面享用。" },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: {
      level: "good",
      label: "Reheats Well",
      tip: "盖保鲜膜微波加热2-3分钟，中途翻拌一次。土豆吸饱汤汁，隔夜更入味。",
    },
    score: 0.87,
  },
  {
    id: 9000012,
    title: "梅菜扣肉 (Hakka Mei Cai Braised Pork Belly)",
    minutes: 100,
    servings: 4,
    calories: 530,
    n_steps: 6,
    tags: ["chinese", "hakka", "pork", "braised", "steamed", "meal-prep", "main-course"],
    ingredients: [
      { name: "五花肉（整块）", amount: 600, unit: "克" },
      { name: "梅干菜（泡发洗净）", amount: 150, unit: "克" },
      { name: "老抽", amount: 3, unit: "汤匙" },
      { name: "生抽", amount: 2, unit: "汤匙" },
      { name: "绍兴料酒", amount: 2, unit: "汤匙" },
      { name: "冰糖", amount: 20, unit: "克" },
      { name: "八角", amount: 2, unit: "个" },
      { name: "蒜末", amount: 4, unit: "瓣" },
      { name: "姜片", amount: 3, unit: "片" },
      { name: "食用油", amount: 3, unit: "汤匙" },
      { name: "清水", amount: 200, unit: "毫升" },
    ],
    steps: [
      { number: 1, step: "五花肉整块冷水下锅焯水5分钟，捞出趁热在猪皮面均匀抹上2汤匙老抽，晾干10分钟。" },
      { number: 2, step: "锅中多放食用油，猪皮朝下将五花肉煎至虎皮金黄起泡（约5分钟），捞出立即浸入冷水冷却定型。" },
      { number: 3, step: "五花肉切约0.5厘米厚片，与生抽、料酒、冰糖和剩余老抽混合，腌制20分钟。" },
      { number: 4, step: "锅中少油，炒香蒜末、姜片和八角，加入泡发的梅干菜大火翻炒3分钟，加少许生抽调味。" },
      { number: 5, step: "扣碗中皮朝下整齐摆放肉片，将炒好的梅干菜铺满肉片上层，倒入炒菜汁和清水，上蒸锅大火蒸60-70分钟。" },
      { number: 6, step: "取出扣肉碗，翻扣在盘中（肉皮朝上），淋上碗底汤汁，趁热搭配白米饭享用。" },
    ],
    fridge_life: { days: "5", label: "5 Days" },
    microwave_score: {
      level: "good",
      label: "Reheats Well",
      tip: "盖保鲜膜微波加热2-3分钟，梅菜充分吸收了肉汁，隔夜更加浓香入味。",
    },
    score: 0.89,
  },
  {
    id: 9000013,
    title: "番茄土豆焖鸡腿肉拌饭 (Tomato Potato Braised Chicken Thigh Rice Bowl)",
    minutes: 40,
    servings: 3,
    calories: 520,
    n_steps: 6,
    tags: ["chinese", "chicken", "tomato", "braised", "meal-prep", "main-course", "rice-bowl"],
    ingredients: [
      { name: "鸡腿肉（去骨切块）", amount: 400, unit: "克" },
      { name: "番茄（切块）", amount: 2, unit: "个（约300克）" },
      { name: "土豆（去皮切滚刀块）", amount: 2, unit: "个（约250克）" },
      { name: "生抽", amount: 2, unit: "汤匙" },
      { name: "老抽", amount: 1, unit: "汤匙" },
      { name: "绍兴料酒", amount: 1, unit: "汤匙" },
      { name: "番茄酱", amount: 1, unit: "汤匙" },
      { name: "白糖", amount: 1, unit: "茶匙" },
      { name: "大蒜（切末）", amount: 3, unit: "瓣" },
      { name: "姜片", amount: 3, unit: "片" },
      { name: "葱花", amount: 1, unit: "根" },
      { name: "食用油", amount: 2, unit: "汤匙" },
      { name: "清水", amount: 150, unit: "毫升" },
    ],
    steps: [
      { number: 1, step: "鸡腿肉去骨切块，加料酒、生抽抓匀腌制10分钟。" },
      { number: 2, step: "锅中热油，大火将鸡腿肉煎至两面金黄，约3分钟，盛出备用。" },
      { number: 3, step: "同锅爆香蒜末和姜片，加入番茄块大火翻炒2分钟至出汁，加番茄酱和白糖炒匀。" },
      { number: 4, step: "放入土豆块翻炒均匀，倒入清水和老抽，大火煮沸。" },
      { number: 5, step: "放回鸡肉，转中小火盖盖焖煮20分钟，至土豆软烂、汤汁浓稠。" },
      { number: 6, step: "开盖大火收汁1-2分钟，撒葱花，淋在白米饭上享用。" },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: {
      level: "good",
      label: "Reheats Well",
      tip: "盖保鲜膜微波加热2分钟，番茄汤汁保持鸡肉湿润，隔夜更入味。",
    },
    score: 0.88,
  },
  {
    id: 9000014,
    title: "锡纸烤蒜蓉金针菇虾滑 (Foil-Baked Garlic Enoki Mushroom with Shrimp Paste)",
    minutes: 25,
    servings: 2,
    calories: 220,
    n_steps: 6,
    tags: ["chinese", "seafood", "shrimp", "mushroom", "baked", "meal-prep", "main-course"],
    ingredients: [
      { name: "鲜虾（去壳去泥肠）", amount: 200, unit: "克" },
      { name: "金针菇（去根）", amount: 200, unit: "克" },
      { name: "大蒜（切末）", amount: 6, unit: "瓣" },
      { name: "小葱（切葱花）", amount: 2, unit: "根" },
      { name: "生抽", amount: 1, unit: "汤匙" },
      { name: "蚝油", amount: 1, unit: "汤匙" },
      { name: "香油", amount: 1, unit: "茶匙" },
      { name: "食用油", amount: 1, unit: "汤匙" },
      { name: "盐", amount: 0.25, unit: "茶匙" },
      { name: "白胡椒粉", amount: 0.25, unit: "茶匙" },
    ],
    steps: [
      { number: 1, step: "鲜虾去壳去泥肠，加盐和白胡椒粉腌制5分钟，用刀背剁成虾滑泥。" },
      { number: 2, step: "锡纸铺平，将金针菇均匀铺在中央，四边折起围成船形。" },
      { number: 3, step: "将虾滑均匀铺在金针菇上方。" },
      { number: 4, step: "锅中热油，小火将蒜末炒至金黄出香，加生抽和蚝油调成蒜蓉酱。" },
      { number: 5, step: "将蒜蓉酱淋在虾滑上，烤箱预热200°C，烤15分钟至虾滑熟透变色。" },
      { number: 6, step: "取出撒葱花，淋香油，趁热享用。" },
    ],
    fridge_life: { days: "2", label: "2 Days" },
    microwave_score: {
      level: "ok",
      label: "Reheat Gently",
      tip: "盖保鲜膜微波60%火力加热1-1.5分钟，避免过热令虾肉变韧。建议当天食用风味最佳。",
    },
    score: 0.85,
  },
  {
    id: 9000015,
    title: "电饭煲广式香菇腊肠焖饭 (Rice Cooker Cantonese Mushroom and Lap Cheong Claypot Rice)",
    minutes: 45,
    servings: 4,
    calories: 490,
    n_steps: 6,
    tags: ["chinese", "cantonese", "rice", "sausage", "mushroom", "meal-prep", "main-course"],
    ingredients: [
      { name: "大米", amount: 300, unit: "克（约2杯）" },
      { name: "广式腊肠（斜切片）", amount: 2, unit: "根（约100克）" },
      { name: "干香菇（提前泡发）", amount: 6, unit: "朵" },
      { name: "生抽", amount: 2, unit: "汤匙" },
      { name: "老抽", amount: 0.5, unit: "汤匙" },
      { name: "蚝油", amount: 1, unit: "汤匙" },
      { name: "香油", amount: 1, unit: "茶匙" },
      { name: "白糖", amount: 0.5, unit: "茶匙" },
      { name: "姜片", amount: 2, unit: "片" },
      { name: "葱花", amount: 2, unit: "根" },
    ],
    steps: [
      { number: 1, step: "干香菇提前泡发30分钟，挤干水分切去蒂，泡香菇水留用（约200毫升）。" },
      { number: 2, step: "大米洗净放入电饭煲，加清水（水位比平常少约50毫升），倒入泡香菇水补足水量。" },
      { number: 3, step: "在米面上铺入香菇和腊肠片，放姜片，按下煮饭键。" },
      { number: 4, step: "电饭煲跳键后，混合生抽、老抽、蚝油、香油和白糖调成酱汁。" },
      { number: 5, step: "将酱汁均匀淋在米饭表面，盖盖再焖10分钟让酱汁充分渗透入味。" },
      { number: 6, step: "开盖用饭勺翻拌均匀，撒葱花即可盛出享用。" },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: {
      level: "good",
      label: "Reheats Well",
      tip: "加少量清水盖保鲜膜，微波加热2分钟，中途翻拌一次，腊肠香味重新散发。",
    },
    score: 0.91,
  },
  {
    id: 9000016,
    title: "滑蛋虾仁盖饭 (Silky Egg and Shrimp Rice Bowl)",
    minutes: 15,
    servings: 2,
    calories: 380,
    n_steps: 5,
    tags: ["chinese", "cantonese", "shrimp", "egg", "stir-fry", "meal-prep", "quick", "rice-bowl"],
    ingredients: [
      { name: "鲜虾仁", amount: 150, unit: "克" },
      { name: "鸡蛋", amount: 3, unit: "个" },
      { name: "葱花", amount: 2, unit: "根" },
      { name: "生抽", amount: 1, unit: "汤匙" },
      { name: "蚝油", amount: 0.5, unit: "汤匙" },
      { name: "香油", amount: 0.5, unit: "茶匙" },
      { name: "盐", amount: 0.25, unit: "茶匙" },
      { name: "白胡椒粉", amount: 0.25, unit: "茶匙" },
      { name: "淀粉（加2汤匙水调成水淀粉）", amount: 1, unit: "茶匙" },
      { name: "食用油", amount: 2, unit: "汤匙" },
      { name: "清水", amount: 100, unit: "毫升" },
    ],
    steps: [
      { number: 1, step: "虾仁加盐、白胡椒粉和少量淀粉抓匀腌制5分钟；鸡蛋打散加少许盐搅拌均匀备用。" },
      { number: 2, step: "锅中热油，大火将虾仁快速滑炒至变色（约1分钟），盛出备用。" },
      { number: 3, step: "锅中加少量油，倒入蛋液大火快速翻炒，蛋液半凝固时放入虾仁一起翻炒均匀，盛出。" },
      { number: 4, step: "另起小锅，加清水、生抽、蚝油和香油煮沸，缓缓淋入水淀粉收成薄芡汁。" },
      { number: 5, step: "将滑蛋虾仁盛在白米饭上，淋上芡汁，撒葱花即可享用。" },
    ],
    fridge_life: { days: "2", label: "2 Days" },
    microwave_score: {
      level: "ok",
      label: "Reheat Gently",
      tip: "盖保鲜膜微波60%火力加热1分钟，鸡蛋不宜过热，建议现做现吃风味最佳。",
    },
    score: 0.86,
  },
  {
    id: 9000017,
    title: "干锅花菜炒肉片 (Dry Pot Cauliflower with Pork Slices)",
    minutes: 20,
    servings: 3,
    calories: 290,
    n_steps: 5,
    tags: ["chinese", "cauliflower", "pork", "stir-fry", "spicy", "meal-prep", "main-course"],
    ingredients: [
      { name: "花椰菜（掰成小朵）", amount: 400, unit: "克" },
      { name: "五花肉（切薄片）", amount: 150, unit: "克" },
      { name: "干辣椒", amount: 4, unit: "个" },
      { name: "大蒜（切片）", amount: 4, unit: "瓣" },
      { name: "生姜（切片）", amount: 3, unit: "片" },
      { name: "郫县豆瓣酱", amount: 1, unit: "汤匙" },
      { name: "生抽", amount: 1.5, unit: "汤匙" },
      { name: "蚝油", amount: 1, unit: "汤匙" },
      { name: "白糖", amount: 0.5, unit: "茶匙" },
      { name: "食用油", amount: 2, unit: "汤匙" },
      { name: "葱花", amount: 1, unit: "根" },
    ],
    steps: [
      { number: 1, step: "花椰菜掰成小朵洗净，沥干水分；五花肉切薄片备用。" },
      { number: 2, step: "锅中热油，中火将五花肉片煸炒至边缘微焦出油，盛出备用。" },
      { number: 3, step: "锅中留底油，大火爆香干辣椒、蒜片和姜片，加郫县豆瓣酱炒出红油。" },
      { number: 4, step: "放入花椰菜大火翻炒3-4分钟，炒至边缘微焦出现焦香（干锅效果的关键）。" },
      { number: 5, step: "放回肉片，加生抽、蚝油和白糖翻炒均匀，撒葱花出锅，搭配白米饭享用。" },
    ],
    fridge_life: { days: "3", label: "3 Days" },
    microwave_score: {
      level: "good",
      label: "Reheats Well",
      tip: "盖保鲜膜微波加热1.5分钟，花椰菜经过微波会更软糯，香辣味保持。",
    },
    score: 0.87,
  },
];

// ─── Upsert recipes ───────────────────────────────────────────────────────────

async function upsertRecipes() {
  console.log(`Upserting ${CHINESE_RECIPES.length} Chinese recipes to Supabase...`);

  // Preserve existing image_url values
  const { data: existing } = await supabase
    .from("recipes")
    .select("id, image_url")
    .in("id", CHINESE_RECIPES.map((r) => r.id));
  const existingImages = new Map(
    (existing ?? []).map((e: { id: number; image_url: string | null }) => [e.id, e.image_url])
  );

  const records = CHINESE_RECIPES.map(({ imagePrompt: _, score: _score, ...r }) => ({
    ...r,
    image_url: existingImages.get(r.id) ?? null,
    enabled: true,
  }));

  const { error } = await supabase.from("recipes").upsert(records, { onConflict: "id" });
  if (error) {
    console.error("Upsert failed:", error.message);
    process.exit(1);
  }

  console.log("✓ Recipes upserted.\n");
}

// ─── Image prompt builder ─────────────────────────────────────────────────────

function buildImagePrompt(recipe: { title: string; ingredients: { name: string; amount: number; unit: string }[]; steps: { number: number; step: string }[]; tags: string[] }): string {
  const englishName = recipe.title.match(/\(([^)]+)\)/)?.[1] ?? recipe.title;
  const chineseName = recipe.title.split(" (")[0];

  // Key visual ingredients (first 6, strip parenthetical notes)
  const keyIngredients = recipe.ingredients
    .slice(0, 6)
    .map((i) => i.name.replace(/（[^）]*）/g, "").trim())
    .join(", ");

  // Infer cooking style from tags and step keywords
  const allSteps = recipe.steps.map((s) => s.step).join(" ");
  const isRoasted = allSteps.includes("烤");
  const isBraised = recipe.tags.some((t) => t === "braised") || allSteps.includes("炖") || allSteps.includes("卤") || allSteps.includes("蒸");
  const isStirFried = recipe.tags.includes("stir-fry") || allSteps.includes("炒");
  const isCold = recipe.tags.includes("cold-dish");
  const isSoup = recipe.tags.includes("soup");

  const cookingDescriptor = isRoasted
    ? "oven-roasted, caramelised glaze, charred edges"
    : isCold
    ? "chilled cold dish, dressed in sauce, garnished"
    : isSoup
    ? "rich broth soup, steaming hot, vibrant colours"
    : isBraised
    ? "slow-braised, tender meat, rich glossy sauce"
    : isStirFried
    ? "wok stir-fried, vibrant mixed colours"
    : "beautifully cooked and plated";

  const lastStep = recipe.steps[recipe.steps.length - 1]?.step ?? "";
  const servingNote = lastStep.includes("米饭")
    ? "served with white steamed rice in a bowl"
    : lastStep.includes("面")
    ? "served with noodles"
    : "elegantly plated on ceramic tableware";

  return (
    `${englishName} (${chineseName}), authentic Chinese meal prep dish. ` +
    `Main ingredients: ${keyIngredients}. ` +
    `${cookingDescriptor}, ${servingNote}. ` +
    `Cinematic food photography, 45-degree close-up angle, warm professional lighting, ` +
    `realistic and appetising, rich textures and colours, professional food styling.`
  );
}

// ─── Generate images ──────────────────────────────────────────────────────────

async function generateImage(recipe: (typeof CHINESE_RECIPES)[0], index: number, total: number) {
  const { id, title } = recipe;
  const prompt = ("imagePrompt" in recipe && recipe.imagePrompt) ? recipe.imagePrompt : buildImagePrompt(recipe);
  console.log(`  [${index}/${total}] Generating image for "${title}"...`);

  try {
    const result = (await fal.run(MODEL, {
      input: {
        prompt,
        image_size: { width: 512, height: 384 },
        style: "realistic_image",
        num_images: 1,
      },
    })) as { data: { images: { url: string }[] } };

    const tempUrl = result.data?.images?.[0]?.url;
    if (!tempUrl) throw new Error("No image URL in fal.ai response");

    // Download image
    const imgRes = await fetch(tempUrl);
    if (!imgRes.ok) throw new Error(`Failed to download image: ${imgRes.status}`);
    const buffer = Buffer.from(await imgRes.arrayBuffer());

    // Upload to Supabase Storage
    const fileName = `${id}.webp`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, buffer, { contentType: "image/webp", upsert: true });
    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    // Get public URL and update DB (append timestamp to bust CDN cache)
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
    const imageUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    const { error: updateError } = await supabase
      .from("recipes")
      .update({ image_url: imageUrl })
      .eq("id", id);
    if (updateError) throw new Error(`DB update failed: ${updateError.message}`);

    console.log(`  [${index}/${total}] ✓ ${title}`);
  } catch (err) {
    const e = err as Error & { body?: unknown };
    console.error(`  [${index}/${total}] ✗ ${title}: ${e.message}`);
    if (e.body) console.error("    detail:", JSON.stringify(e.body).slice(0, 200));
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await upsertRecipes();

  // Only generate images for recipes that don't have one yet
  const { data: existing } = await supabase
    .from("recipes")
    .select("id, image_url")
    .in("id", CHINESE_RECIPES.map((r) => r.id));

  const missingImages = CHINESE_RECIPES.filter((r) => {
    if (FORCE_REGENERATE_IDS.has(r.id)) return true;
    const row = (existing ?? []).find((e: { id: number; image_url: string | null }) => e.id === r.id);
    return !row?.image_url;
  });

  if (missingImages.length > 0) {
    console.log(`Generating AI images for ${missingImages.length} recipe(s)...`);
    for (let i = 0; i < missingImages.length; i++) {
      await generateImage(missingImages[i], i + 1, missingImages.length);
    }
  } else {
    console.log("All images already generated — skipping.");
  }

  console.log("\n✓ Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
