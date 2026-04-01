import * as dotenv from "dotenv";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function main() {
  const { error, count } = await supabase
    .from("recipes")
    .delete({ count: "exact" })
    .lt("id", 9000000);

  if (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
  console.log(`✓ Deleted ${count} Food.com recipes. Only AI-generated recipes remain.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
