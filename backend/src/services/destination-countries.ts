import { z } from 'zod';

export const DEFAULT_DESTINATION_COUNTRIES = ['Burkina Faso', 'Mali', 'Niger'];
export function activeDestinationCountries(countries: string[], disabled: string[]): string[] {
  return countries.filter(country => !disabled.includes(country));
}
const key = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
export const destinationCountrySchema = z.string().trim().min(2, 'Nom du pays requis.').max(80)
  .regex(/^[\p{L}][\p{L}\s’'()-]*$/u, 'Saisissez un nom de pays, sans chiffres ni caractères spéciaux.')
  .transform(value => value.replace(/\s+/g, ' '))
  .refine(value => !['TG', 'TGO', 'TOGO', 'REPUBLIQUE TOGOLAISE', 'REPUBLIQUE DU TOGO', 'A CONFIRMER', 'INCONNU', 'NON RENSEIGNE'].includes(key(value)), 'Destination non autorisée : le Togo et les pays non renseignés sont exclus.');

export function configuredDestination(value: string | undefined, countries: string[]): string | undefined {
  if (!value || !destinationCountrySchema.safeParse(value).success) return undefined;
  return countries.find(country => key(country) === key(value));
}
