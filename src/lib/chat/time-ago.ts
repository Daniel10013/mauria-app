// Formata uma data como tempo relativo em PT-BR ("agora", "há 2h",
// "ontem", "há 3 dias"). Usa Intl.RelativeTimeFormat.

const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

export function formatRelativeBR(date: Date): string {
  const now = Date.now();
  const diffSec = Math.round((date.getTime() - now) / 1000);
  const absSec = Math.abs(diffSec);

  if (absSec < 45) return "agora";
  if (absSec < 60 * 60) return rtf.format(Math.round(diffSec / 60), "minute");
  if (absSec < 60 * 60 * 24) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (absSec < 60 * 60 * 24 * 7)
    return rtf.format(Math.round(diffSec / 86400), "day");
  if (absSec < 60 * 60 * 24 * 30)
    return rtf.format(Math.round(diffSec / (86400 * 7)), "week");
  if (absSec < 60 * 60 * 24 * 365)
    return rtf.format(Math.round(diffSec / (86400 * 30)), "month");
  return rtf.format(Math.round(diffSec / (86400 * 365)), "year");
}
