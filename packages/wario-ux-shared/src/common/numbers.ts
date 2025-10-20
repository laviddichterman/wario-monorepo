import numeral from 'numeral';

export function fCurrency(number: number) {
  return numeral(number).format('$0,0.00');
}

export function fCurrencyNoUnit(number: number) {
  return numeral(number).format('0,0.00');
}

export function fPercent(number: number) {
  return numeral(number).format('0.00%');
}