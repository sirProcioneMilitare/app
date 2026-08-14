const STRIPE_COLORS: Record<string, [string, string]> = {
  "yoga-insieme": ["#E3DED0", "#EFEAE0"],
  "massaggio-collo-schiena": ["#E8D9CF", "#F3E9E2"],
  "passeggiata-col-cane": ["#D9E2D4", "#E8EEE4"],
  "colazione-a-letto": ["#EFE3C9", "#F7F0DE"],
  "ora-di-silenzio-garantito": ["#DEDCD6", "#EBE9E3"],
  "cena-a-sorpresa": ["#E4D3D3", "#F0E3E3"],
};

export function serviceStripe(slug: string): string {
  const [c1, c2] = STRIPE_COLORS[slug] ?? ["#E3DED0", "#EFEAE0"];
  return `repeating-linear-gradient(115deg, ${c1} 0 10px, ${c2} 10px 20px)`;
}
