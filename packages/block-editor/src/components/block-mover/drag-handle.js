/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { IconButton } from '@wordpress/components';

/**
 * Internal dependencies
 */
import BlockDraggable from '../block-draggable';
import { dragHandle } from './icons';

export const IconDragHandle = ( { className, clientIds } ) => {
	const dragHandleClassNames = classnames( 'editor-block-mover__control-drag-handle block-editor-block-mover__control-drag-handle', className );

	return (
		<BlockDraggable clientIds={ clientIds }>
			{
				( { onDraggableStart, onDraggableEnd } ) => (
					<IconButton
						icon={ dragHandle }
						className={ dragHandleClassNames }
						aria-hidden="true"
						onDragStart={ onDraggableStart }
						onDragEnd={ onDraggableEnd }
						draggable
					/>
				) }
		</BlockDraggable>
	);
};
