/**
 * WordPress dependencies
 */
import { useSelect } from '@wordpress/data';

/**
 * Internal dependencies
 */
import BlockMover from '../block-mover';
import BlockSwitcher from '../block-switcher';
import BlockControls from '../block-controls';
import BlockFormatControls from '../block-format-controls';
import BlockSettingsMenu from '../block-settings-menu';

function BlockToolbar( { moverDirection } ) {
	const { blockIds, isValid, mode } = useSelect( ( select ) => {
		const {
			getBlockMode,
			getSelectedBlockClientIds,
			isBlockValid,
		} = select( 'core/block-editor' );
		const blockClientIds = getSelectedBlockClientIds();
		return {
			blockIds: blockClientIds,
			isValid: blockClientIds.length === 1 ? isBlockValid( blockClientIds[ 0 ] ) : null,
			mode: blockClientIds.length === 1 ? getBlockMode( blockClientIds[ 0 ] ) : null,
		};
	} );

	if ( blockIds.length === 0 ) {
		return null;
	}
	const shouldShowVisualToolbar = isValid && mode === 'visual';
	const isMultiToolbar = blockIds.length > 1;

	return (
		<div className="editor-block-toolbar block-editor-block-toolbar">
			<BlockMover
				clientIds={ blockIds }
				__experimentalOrientation={ moverDirection }
			/>
			{ ( shouldShowVisualToolbar || isMultiToolbar ) && <BlockSwitcher clientIds={ blockIds } /> }
			{ shouldShowVisualToolbar && ! isMultiToolbar && (
				<>
					<BlockControls.Slot bubblesVirtually className="block-editor-block-toolbar__slot" />
					<BlockFormatControls.Slot bubblesVirtually className="block-editor-block-toolbar__slot" />
				</>
			) }
			<BlockSettingsMenu clientIds={ blockIds } />
		</div>
	);
}

export default BlockToolbar;
