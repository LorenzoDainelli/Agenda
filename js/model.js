/* Agenda — gli id.
 *
 * Qui viveva il modello di un compito, con la regola della finestra. Dal
 * giro in cui l'app è diventata solo orario e voti (A73) resta solo quello
 * che serve a tutti: un id per una materia o per un voto. Il modello del
 * compito è nella storia di git, se un giorno torna a servire.
 */

/** Un id corto, leggibile in un file di backup e abbastanza unico per un telefono. */
export function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
