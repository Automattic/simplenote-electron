declare module 'gridicons' {
  import { ComponentType, SVGProps } from 'react';

  type GridiconProps = Omit<SVGProps<SVGSVGElement>, 'ref'> & {
    icon: string;
    size?: number;
  };

  const Gridicon: ComponentType<GridiconProps>;
  export default Gridicon;
}
