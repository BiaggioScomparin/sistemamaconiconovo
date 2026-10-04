export function isVeneravelMestre(position?: string | null): boolean {
  if (!position) return false;
  const p = position.toLowerCase().trim();
  return p === 'veneravel_mestre' || p === 'veneravel mestre' || p === 'venerável mestre';
}

export function isTesoureiro(position?: string | null): boolean {
  if (!position) return false;
  const p = position.toLowerCase().trim();
  return p === 'tesoureiro';
}

export function isChanceler(position?: string | null): boolean {
  if (!position) return false;
  const p = position.toLowerCase().trim();
  return p === 'chanceler';
}
