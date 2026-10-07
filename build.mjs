import { writeFile } from "node:fs/promises";
const url=process.env.SUPABASE_URL||"";
const key=process.env.SUPABASE_PUBLISHABLE_KEY||"";
await writeFile("config.js", `window.APP_CONFIG=${JSON.stringify({SUPABASE_URL:url,SUPABASE_PUBLISHABLE_KEY:key})};\n`);
console.log("Generated config.js");