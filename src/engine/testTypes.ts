export type Stimulus = Record<string, unknown>;
export type TestPhase = 'intro' | 'practice' | 'exam' | 'done';

export interface TestGenerator {
	(seed: number): Stimulus[];
}
export interface TestValidator {
	(stimulus: Stimulus, response: string): boolean;
}
export interface TestConfig {
	id: string;
	title: string;
	instructionsMD: string;
	example?: Stimulus[];
	practiceCount: number;
	examCount: number;
	generator: TestGenerator;
	validator: TestValidator;
	keymap: Record<string, string>;
	timeLimitSec: number;
}
