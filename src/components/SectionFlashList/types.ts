import type {FlashList, FlashListProps} from '@shopify/flash-list';
import type {ForwardedRef} from 'react';

type SectionFlashListProps<ItemT> = FlashListProps<ItemT>;
type SectionFlashListRef<ItemT> = ForwardedRef<FlashList<ItemT>>;

export type {SectionFlashListProps, SectionFlashListRef};
