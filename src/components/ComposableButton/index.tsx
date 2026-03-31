import DoubleDeckButton from './composed/DoubleDeckButton';
import IconButton from './composed/IconButton';
import LinkButton from './composed/LinkButton';
import TextButton from './composed/TextButton';
import TextWithIconButton from './composed/TextWithIconButton';
import TextWithRightIconButton from './composed/TextWithRightIconButton';
import ButtonAlignLeftText from './primitives/ButtonAlignLeftText';
import ButtonIcon from './primitives/ButtonIcon';
import ButtonIconLeft from './primitives/ButtonIconLeft';
import ButtonIconRight from './primitives/ButtonIconRight';
import ButtonSecondLineText from './primitives/ButtonSecondLineText';
import ButtonText from './primitives/ButtonText';
import ButtonWrapper from './primitives/ButtonWrapper';

const ComposableButton = Object.assign(TextButton, {
    Text: ButtonText,
    AlignLeftText: ButtonAlignLeftText,
    Icon: ButtonIcon,
    IconLeft: ButtonIconLeft,
    IconRight: ButtonIconRight,
    SecondLineText: ButtonSecondLineText,
    Wrapper: ButtonWrapper,
    TextButton,
    TextWithIcon: TextWithIconButton,
    TextWithRightIcon: TextWithRightIconButton,
    IconButton,
    DoubleDeck: DoubleDeckButton,
    Link: LinkButton,
});

export default ComposableButton;
