import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const data=readFileSync(new URL("../lib/arena-games.ts",import.meta.url),"utf8");
const nav=readFileSync(new URL("../app/components/workspace-shell.tsx",import.meta.url),"utf8");
const ui=readFileSync(new URL("../app/arena/arena-workspace.tsx",import.meta.url),"utf8");
test("all ten Arena source game IDs included",()=>{for(const id of ["logic-circuit-lab","orbital-ballistics-sim","matrix-transform-arena","algorithm-sort-duel","stoichiometry-balancer","equilibrium-market-sim","cipher-breaker-lab","binary-hex-bridge","calculus-integral-estimator","periodic-element-forge"]) assert.equal(data.split('"id": "'+id+'"').length-1,1,id)});
test("three roles have Arena in navigation",()=>assert.equal((nav.match(/href: "\/arena", label: "JARVIS Arena"/g)||[]).length,3));
test("practice supports answers and reset without ranked XP",()=>{for(const s of ["function check()","function reset(","function next()","Play again","aria-checked","NO RANKED XP"])assert.ok(ui.includes(s),s)});
