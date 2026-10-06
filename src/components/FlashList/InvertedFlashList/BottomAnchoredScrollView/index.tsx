import type {FlashListProps} from '@shopify/flash-list';

type RenderScrollComponent = FlashListProps<unknown>['renderScrollComponent'];

/** No keyboard resizes the list on web, and other resizes near the bottom are followed through maintainVisibleContentPosition. */
function createBottomAnchoredScrollComponent(renderScrollComponent: RenderScrollComponent): RenderScrollComponent {
    return renderScrollComponent;
}

export default createBottomAnchoredScrollComponent;
