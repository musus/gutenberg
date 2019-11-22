/**
 * WordPress dependencies
 */
import { Draggable } from '@wordpress/components';
import { useSelect, useDispatch } from '@wordpress/data';

const BlockDraggable = ( { children, clientIds } ) => {
	const { srcRootClientId, index, isDraggable } = useSelect( ( select ) => {
		const {
			getBlockIndex,
			getBlockRootClientId,
			getTemplateLock,
		} = select( 'core/block-editor' );
		const rootClientId = clientIds.length === 1 ? getBlockRootClientId( clientIds[ 0 ] ) : null;
		const templateLock = rootClientId ? getTemplateLock( rootClientId ) : null;

		return {
			index: getBlockIndex( clientIds[ 0 ], rootClientId ),
			srcRootClientId: rootClientId,
			isDraggable: clientIds.length === 1 && 'all' !== templateLock,
		};
	}, [ clientIds ] );
	const { startDraggingBlocks, stopDraggingBlocks } = useDispatch( 'core/block-editor' );

	if ( ! isDraggable ) {
		return null;
	}

	const blockElementId = `block-${ clientIds[ 0 ] }`;
	const transferData = {
		type: 'block',
		srcIndex: index,
		srcClientId: clientIds[ 0 ],
		srcRootClientId,
	};

	return (
		<Draggable
			elementId={ blockElementId }
			transferData={ transferData }
			onDragStart={ startDraggingBlocks }
			onDragEnd={ stopDraggingBlocks }
		>
			{
				( { onDraggableStart, onDraggableEnd } ) => {
					return children( {
						onDraggableStart,
						onDraggableEnd,
					} );
				}
			}
		</Draggable>
	);
};

export default BlockDraggable;
