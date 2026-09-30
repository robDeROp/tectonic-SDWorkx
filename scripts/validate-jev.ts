/** Live provider probe with fictional data; never prints credentials or source text. */
import { assessWithJev } from "../lib/jev";

const result = await assessWithJev({
  question: "Welke documenten zijn nodig voor de eindafrekening van deze fictieve Belgische bediende?",
  answer: "",
  documents: [{
    id: "jev-cloud-validation",
    name: "Fictieve interne checklist",
    kind: "Intern",
    date: new Date().toISOString().slice(0, 10),
    content: "FICTIEVE VALIDATIECASUS. Verzamel de loonhistoriek, opgenomen vakantiedagen en reeds betaald vakantiegeld. Bezorg een vakantieattest bij uitdiensttreding.",
    fictional: true,
  }],
});
const assessment = result["jev-cloud-validation"];
if (!assessment?.freshness) throw new Error("Incomplete live Jev assessment");
console.log(JSON.stringify({ check: "live-jev", passed: true, ...assessment }));
