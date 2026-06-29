import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'appCurrency',
  standalone: true,
})
export class AppCurrencyPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    const amount = Number.isFinite(value) ? Number(value) : 0;
    const hasDecimals = amount % 1 !== 0;
    const formatted = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(amount);

    return formatted.replace('MX$', '$').replace('MXN', '$').trim();
  }
}
