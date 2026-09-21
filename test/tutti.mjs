/* Agenda — tutte le prove, in fila.
 *
 *   node test/tutti.mjs
 *
 * Non serve un browser e non serve installare niente: i moduli che si provano
 * qui (days, model, timetable, subjects, tasks) non toccano la pagina, e sono
 * i moduli in cui vivono le regole dell'app. Quelli che disegnano si provano
 * aprendola.
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const files = ["days.mjs", "model.mjs", "timetable.mjs", "tasks.mjs"];

let falliti = 0;
for (const file of files) {
  console.log(`\n\u001b[1m── ${file} ${"─".repeat(Math.max(0, 60 - file.length))}\u001b[0m`);
  const run = spawnSync(process.execPath, [join(here, file)], { stdio: "inherit" });
  if (run.status !== 0) falliti += 1;
}

console.log(falliti === 0
  ? "\n\u001b[32mTutte le prove passate.\u001b[0m"
  : `\n\u001b[31m${falliti} file di prove con errori.\u001b[0m`);
process.exit(falliti ? 1 : 0);
