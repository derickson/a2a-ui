/**
 * Pre-import EUI icons to work around Vite's inability to handle
 * EUI's dynamic import() for icon assets.
 *
 * See: https://github.com/elastic/eui/issues/5463
 */
import { appendIconComponentCache } from '@elastic/eui/es/components/icon/icon';

import { icon as arrowDown } from '@elastic/eui/es/components/icon/assets/arrow_down';
import { icon as arrowRight } from '@elastic/eui/es/components/icon/assets/arrow_right';
import { icon as compute } from '@elastic/eui/es/components/icon/assets/compute';
import { icon as cross } from '@elastic/eui/es/components/icon/assets/cross';
import { icon as discuss } from '@elastic/eui/es/components/icon/assets/discuss';
import { icon as gear } from '@elastic/eui/es/components/icon/assets/gear';
import { icon as menu } from '@elastic/eui/es/components/icon/assets/menu';
import { icon as moon } from '@elastic/eui/es/components/icon/assets/moon';
import { icon as plus } from '@elastic/eui/es/components/icon/assets/plus';
import { icon as stop } from '@elastic/eui/es/components/icon/assets/stop';
import { icon as sun } from '@elastic/eui/es/components/icon/assets/sun';
import { icon as trash } from '@elastic/eui/es/components/icon/assets/trash';

appendIconComponentCache({
  arrowDown,
  arrowRight,
  compute,
  cross,
  discuss,
  gear,
  menu,
  moon,
  plus,
  stop,
  sun,
  trash,
});
