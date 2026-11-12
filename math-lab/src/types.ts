export type ModuleId =
  | 'functions'
  | 'integrals'
  | 'matrices'
  | 'vectors'
  | 'limits'
  | 'trigonometry'
  | 'complex'
  | 'probability';

export interface Module {
  id: ModuleId;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export interface MathFact {
  text: string;
  formula?: string;
}
