import type { TestConfig, Stimulus } from '../engine/testTypes';

function mulberry32(a: number) {
	return function () {
		let t = (a += 0x6d2b79f5);
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
const rInt = (rng: () => number, min: number, max: number) =>
	Math.floor(rng() * (max - min + 1)) + min;

type Op = '+' | '-' | '×' | '÷';
function evalOp(a: number, op: Op, b: number) {
	switch (op) {
		case '+':
			return a + b;
		case '-':
			return a - b;
		case '×':
			return a * b;
		case '÷':
			return a / b;
	}
}

/* ------------------------------------------------- */
/*                Expression generators              */
/* ------------------------------------------------- */

function makeExpr(rng: () => number): {
	a: number;
	op: Op;
	b: number;
	text: string;
} {
	const ops: Op[] = ['+', '-', '×', '÷'];
	const op = ops[rInt(rng, 0, ops.length - 1)];

	if (op === '+') {
		const a = rInt(rng, 10, 90);
		const b = rInt(rng, 5, 50);
		return { a, op, b, text: `${a} + ${b}` };
	}

	if (op === '-') {
		const a = rInt(rng, 20, 120);
		const b = rInt(rng, 5, Math.min(60, a - 5)); // geen negatieve of nul
		return { a, op, b, text: `${a} - ${b}` };
	}

	if (op === '×') {
		const a = rInt(rng, 3, 12);
		const b = rInt(rng, 3, 12);
		const result = a * b;
		if (result > 150) return makeExpr(rng); // overslaan te grote producten
		return { a, op, b, text: `${a} × ${b}` };
	}

	// ÷
	const divisors = [2, 3, 4, 5, 6, 8, 10, 12];
	const b = divisors[rInt(rng, 0, divisors.length - 1)];
	const q = rInt(rng, 2, 15);
	const a = b * q;
	const result = a / b;
	if (result > 150) return makeExpr(rng);
	return { a, op, b, text: `${a} ÷ ${b}` };
}

/** construeert expressie die exact target oplevert (voor G-cases) */
function exprForTarget(rng: () => number, target: number) {
	// beperkt tot redelijke vormen
	if (target < 5) return { a: target, op: '+', b: 0, text: `${target} + 0` };

	const choose = rInt(rng, 0, 2);
	if (choose === 0) {
		const x = rInt(rng, 2, Math.min(target - 2, 60));
		const y = target - x;
		if (y > 0) return { a: x, op: '+', b: y, text: `${x} + ${y}` };
	}
	if (choose === 1 && target % 2 === 0 && target <= 140) {
		return { a: target / 2, op: '×', b: 2, text: `${target / 2} × 2` };
	}
	const a = target + rInt(rng, 3, 8);
	const b = a - target;
	return { a, op: '-', b, text: `${a} - ${b}` };
}

/* ------------------------------------------------- */
/*                     Items                         */
/* ------------------------------------------------- */

function makeItem(rng: () => number): Stimulus {
	const scherm1 = makeExpr(rng);
	const rScherm1 = evalOp(scherm1.a, scherm1.op, scherm1.b);

	const roll = rng();
	let scherm2, rScherm2;

	// 12 % echte gelijkheid
	if (roll < 0.12) {
		scherm2 = exprForTarget(rng, rScherm1);
		rScherm2 = rScherm1;
	} else {
		scherm2 = makeExpr(rng);
		rScherm2 = evalOp(scherm2.a, scherm2.op, scherm2.b);

		// 40 % near-cases (±10–15%)
		const relDiff = Math.abs(rScherm1 - rScherm2) / Math.max(rScherm1, 1);
		if (relDiff > 0.15) {
			const factor = 1 + (rng() - 0.5) * 0.25;
			const newVal = Math.max(1, Math.round(rScherm1 * factor));
			scherm2 = exprForTarget(rng, newVal);
			rScherm2 = newVal;
		}
	}

	const correct: 'S1' | 'S2' | 'G' =
		rScherm1 === rScherm2 ? 'G' : rScherm1 > rScherm2 ? 'S1' : 'S2';

	return { scherm1, scherm2, rScherm1, rScherm2, correct };
}

/* ------------------------------------------------- */
/*                     Config                        */
/* ------------------------------------------------- */

export const getalwaTest: TestConfig = {
	id: 'arith',
	title: 'GETALVAARDIGHEIDSTEST',
	instructionsMD:
		'Je krijgt twee rekenopgaven na elkaar. Bereken elke uitkomst in je hoofd en onthoud ze. Daarna kies je: S1 (Scherm 1 groter), S2 (Scherm 2 groter) of G (gelijk).',
	practiceCount: 9,
	examCount: 25,
	timeLimitSec: 600,
	keymap: { '1': 'S1', '2': 'S2', '3': 'G', b: 'S1', o: 'S2', g: 'G' },
	generator: (seed: number) => {
		const rng = mulberry32(seed);
		const items: Stimulus[] = [];
		for (let i = 0; i < 250; i++) items.push(makeItem(rng));
		return items;
	},
	validator: (stim: any, resp: string) => stim.correct === resp,
};
