import { NumberFormatProps } from 'react-number-format';
import dynamic from 'next/dynamic';

const NumberFormat = dynamic(() => import('react-number-format'), { ssr: false });
interface P extends NumberFormatProps {}
export default ({ decimalScale, ...props } : P) => (
  <NumberFormat
    {...props}
    displayType="text"
    decimalScale={decimalScale || 2}
    decimalSeparator=","
    thousandSeparator="."
  />
);
