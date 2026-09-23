import { containerScopeFor } from './access-control';

export function parseOperationTerminal(value: unknown): 'TOUS' | 'LCT' | 'TOGO' {
  if (value === undefined) return 'TOUS';
  if (value === 'TOUS' || value === 'LCT' || value === 'TOGO') return value;
  throw new Error('Terminal invalide : utilisez TOUS, LCT ou TOGO.');
}

export function operationScopeFor(user: Parameters<typeof containerScopeFor>[0], value: unknown) {
  const requested = parseOperationTerminal(value);
  const terminal = requested === 'TOUS' ? user.role === 'CONTROLEUR_LCT' ? 'LCT' : user.role === 'CONTROLEUR_TOGO' ? 'TOGO' : 'TOUS' : requested;
  return {
    // Never replace the role's scope with the requested terminal.
    where: { AND: [containerScopeFor(user), ...(terminal === 'TOUS' ? [] : [{ terminalAffecte: terminal }])] },
    terminal,
    label: terminal === 'TOUS' ? 'Tous les terminaux autorisés' : terminal === 'LCT' ? 'LCT — périmètre autorisé' : 'Togo Terminal — périmètre autorisé',
    suffix: terminal === 'TOUS' ? '' : `-${terminal.toLowerCase()}`,
  };
}
