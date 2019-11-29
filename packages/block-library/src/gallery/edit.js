/**
 * External dependencies
 */
import classnames from 'classnames';
import {
	every,
	filter,
	find,
	forEach,
	get,
	isEmpty,
	map,
	reduce,
	some,
} from 'lodash';

/**
 * WordPress dependencies
 */
import { compose } from '@wordpress/compose';
import {
	PanelBody,
	RangeControl,
	SelectControl,
	ToggleControl,
	withNotices,
} from '@wordpress/components';
import {
	BlockIcon,
	MediaPlaceholder,
	InspectorControls,
	RichText,
} from '@wordpress/block-editor';
import { Component } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { getBlobByURL, isBlobURL, revokeBlobURL } from '@wordpress/blob';
import { withSelect } from '@wordpress/data';

/**
 * Internal dependencies
 */
import GalleryImage from './gallery-image';
import { icon } from './icons';
import { defaultColumnsNumber, pickRelevantMediaFiles } from './shared';

const MAX_COLUMNS = 8;
const linkOptions = [
	{ value: 'attachment', label: __( 'Attachment Page' ) },
	{ value: 'media', label: __( 'Media File' ) },
	{ value: 'none', label: __( 'None' ) },
];
const ALLOWED_MEDIA_TYPES = [ 'image' ];

class GalleryEdit extends Component {
	constructor() {
		super( ...arguments );

		this.onSelectImage = this.onSelectImage.bind( this );
		this.onSelectImages = this.onSelectImages.bind( this );
		this.setLinkTo = this.setLinkTo.bind( this );
		this.setColumnsNumber = this.setColumnsNumber.bind( this );
		this.toggleImageCrop = this.toggleImageCrop.bind( this );
		this.onMove = this.onMove.bind( this );
		this.onMoveForward = this.onMoveForward.bind( this );
		this.onMoveBackward = this.onMoveBackward.bind( this );
		this.onRemoveImage = this.onRemoveImage.bind( this );
		this.onUploadError = this.onUploadError.bind( this );
		this.setImageAttributes = this.setImageAttributes.bind( this );
		this.setAttributes = this.setAttributes.bind( this );
		this.onFocusGalleryCaption = this.onFocusGalleryCaption.bind( this );
		this.getImagesSizeOptions = this.getImagesSizeOptions.bind( this );
		this.updateImagesSize = this.updateImagesSize.bind( this );

		this.state = {
			selectedImage: null,
			attachmentCaptions: null,
		};
	}

	setAttributes( attributes ) {
		if ( attributes.ids ) {
			throw new Error( 'The "ids" attribute should not be changed directly. It is managed automatically when "images" attribute changes' );
		}

		if ( attributes.images ) {
			attributes = {
				...attributes,
				ids: map( attributes.images, 'id' ),
			};
		}

		this.props.setAttributes( attributes );
	}

	onSelectImage( index ) {
		return () => {
			if ( this.state.selectedImage !== index ) {
				this.setState( {
					selectedImage: index,
				} );
			}
		};
	}

	onMove( oldIndex, newIndex ) {
		const images = [ ...this.props.attributes.images ];
		images.splice( newIndex, 1, this.props.attributes.images[ oldIndex ] );
		images.splice( oldIndex, 1, this.props.attributes.images[ newIndex ] );
		this.setState( { selectedImage: newIndex } );
		this.setAttributes( { images } );
	}

	onMoveForward( oldIndex ) {
		return () => {
			if ( oldIndex === this.props.attributes.images.length - 1 ) {
				return;
			}
			this.onMove( oldIndex, oldIndex + 1 );
		};
	}

	onMoveBackward( oldIndex ) {
		return () => {
			if ( oldIndex === 0 ) {
				return;
			}
			this.onMove( oldIndex, oldIndex - 1 );
		};
	}

	onRemoveImage( index ) {
		return () => {
			const images = filter( this.props.attributes.images, ( img, i ) => index !== i );
			const { columns } = this.props.attributes;
			this.setState( { selectedImage: null } );
			this.setAttributes( {
				images,
				columns: columns ? Math.min( images.length, columns ) : columns,
			} );
		};
	}

	selectCaption( newImage, images, attachmentCaptions ) {
		const currentImage = find(
			images, { id: newImage.id }
		);

		const currentImageCaption = currentImage ? currentImage.caption : newImage.caption;

		if ( ! attachmentCaptions ) {
			return currentImageCaption;
		}

		const attachment = find(
			attachmentCaptions, { id: newImage.id }
		);

		// if the attachment caption is updated
		if ( attachment && ( attachment.caption !== newImage.caption ) ) {
			return newImage.caption;
		}

		return currentImageCaption;
	}

	onSelectImages( newImages ) {
		const { columns, images, sizeSlug } = this.props.attributes;
		const { attachmentCaptions } = this.state;
		this.setState(
			{
				attachmentCaptions: newImages.map( ( newImage ) => ( {
					id: newImage.id,
					caption: newImage.caption,
				} ) ),
			}
		);
		this.setAttributes( {
			images: newImages.map( ( newImage ) => ( {
				...pickRelevantMediaFiles( newImage, sizeSlug ),
				caption: this.selectCaption( newImage, images, attachmentCaptions ),
			} ) ),
			columns: columns ? Math.min( newImages.length, columns ) : columns,
		} );
	}

	onUploadError( message ) {
		const { noticeOperations } = this.props;
		noticeOperations.removeAllNotices();
		noticeOperations.createErrorNotice( message );
	}

	setLinkTo( value ) {
		this.setAttributes( { linkTo: value } );
	}

	setColumnsNumber( value ) {
		this.setAttributes( { columns: value } );
	}

	toggleImageCrop() {
		this.setAttributes( { imageCrop: ! this.props.attributes.imageCrop } );
	}

	getImageCropHelp( checked ) {
		return checked ? __( 'Thumbnails are cropped to align.' ) : __( 'Thumbnails are not cropped.' );
	}

	onFocusGalleryCaption() {
		this.setState( {
			selectedImage: null,
		} );
	}

	setImageAttributes( index, attributes ) {
		const { attributes: { images } } = this.props;
		const { setAttributes } = this;
		if ( ! images[ index ] ) {
			return;
		}
		setAttributes( {
			images: [
				...images.slice( 0, index ),
				{
					...images[ index ],
					...attributes,
				},
				...images.slice( index + 1 ),
			],
		} );
	}

	getImagesSizeOptions() {
		const { imageSizes } = this.props;
		return map( imageSizes, ( { name, slug } ) => ( { value: slug, label: name } ) );
	}

	updateImagesSize( sizeSlug ) {
		const { attributes: { images }, resizedImages } = this.props;

		const updatedImages = map( images, ( image ) => {
			if ( ! image.id ) {
				return image;
			}
			const url = get( resizedImages, [ parseInt( image.id, 10 ), sizeSlug ] );
			return {
				...image,
				...( url && { url } ),
			};
		} );

		this.setAttributes( { images: updatedImages, sizeSlug } );
	}

	componentDidMount() {
		const { attributes, mediaUpload } = this.props;
		const { images } = attributes;
		if ( every( images, ( { url } ) => isBlobURL( url ) ) ) {
			const filesList = map( images, ( { url } ) => getBlobByURL( url ) );
			forEach( images, ( { url } ) => revokeBlobURL( url ) );
			mediaUpload( {
				filesList,
				onFileChange: this.onSelectImages,
				allowedTypes: [ 'image' ],
			} );
		}
	}

	componentDidUpdate( prevProps ) {
		// Deselect images when deselecting the block
		if ( ! this.props.isSelected && prevProps.isSelected ) {
			this.setState( {
				selectedImage: null,
				captionSelected: false,
			} );
		}
	}

	render() {
		const {
			attributes,
			className,
			isSelected,
			noticeUI,
			setAttributes,
		} = this.props;
		const {
			align,
			columns = defaultColumnsNumber( attributes ),
			caption,
			imageCrop,
			images,
			linkTo,
			sizeSlug,
		} = attributes;

		const hasImages = !! images.length;
		const hasImagesWithId = hasImages && some( images, ( { id } ) => id );

		const mediaPlaceholder = (
			<MediaPlaceholder
				addToGallery={ hasImagesWithId }
				isAppender={ hasImages }
				className={ className }
				disableMediaButtons={ hasImages && ! isSelected }
				icon={ ! hasImages && <BlockIcon icon={ icon } /> }
				labels={ {
					title: ! hasImages && __( 'Gallery' ),
					instructions: ! hasImages && __( 'Drag images, upload new ones or select files from your library.' ),
				} }
				onSelect={ this.onSelectImages }
				accept="image/*"
				allowedTypes={ ALLOWED_MEDIA_TYPES }
				multiple
				value={ hasImagesWithId ? images : undefined }
				onError={ this.onUploadError }
				notices={ hasImages ? undefined : noticeUI }
			/>
		);

		if ( ! hasImages ) {
			return mediaPlaceholder;
		}

		const captionClassNames = classnames(
			'blocks-gallery-caption',
			{
				'screen-reader-text': ! isSelected && RichText.isEmpty( caption ),
			}
		);

		const imageSizeOptions = this.getImagesSizeOptions();

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Gallery Settings' ) }>
						{ images.length > 1 && <RangeControl
							label={ __( 'Columns' ) }
							value={ columns }
							onChange={ this.setColumnsNumber }
							min={ 1 }
							max={ Math.min( MAX_COLUMNS, images.length ) }
							required
						/> }
						<ToggleControl
							label={ __( 'Crop Images' ) }
							checked={ !! imageCrop }
							onChange={ this.toggleImageCrop }
							help={ this.getImageCropHelp }
						/>
						<SelectControl
							label={ __( 'Link To' ) }
							value={ linkTo }
							onChange={ this.setLinkTo }
							options={ linkOptions }
						/>
						{ hasImages && ! isEmpty( imageSizeOptions ) && (
							<SelectControl
								label={ __( 'Images Size' ) }
								value={ sizeSlug }
								options={ imageSizeOptions }
								onChange={ this.updateImagesSize }
							/>
						) }
					</PanelBody>
				</InspectorControls>
				{ noticeUI }
				<figure className={ classnames(
					className,
					{
						[ `align${ align }` ]: align,
						[ `columns-${ columns }` ]: columns,
						'is-cropped': imageCrop,
					}
				) }
				>
					<ul className="blocks-gallery-grid">
						{ images.map( ( img, index ) => {
						/* translators: %1$d is the order number of the image, %2$d is the total number of images. */
							const ariaLabel = sprintf( __( 'image %1$d of %2$d in gallery' ), ( index + 1 ), images.length );

							return (
								<li className="blocks-gallery-item" key={ img.id || img.url }>
									<GalleryImage
										url={ img.url }
										alt={ img.alt }
										id={ img.id }
										isFirstItem={ index === 0 }
										isLastItem={ ( index + 1 ) === images.length }
										isSelected={ isSelected && this.state.selectedImage === index }
										onMoveBackward={ this.onMoveBackward( index ) }
										onMoveForward={ this.onMoveForward( index ) }
										onRemove={ this.onRemoveImage( index ) }
										onSelect={ this.onSelectImage( index ) }
										setAttributes={ ( attrs ) => this.setImageAttributes( index, attrs ) }
										caption={ img.caption }
										aria-label={ ariaLabel }
									/>
								</li>
							);
						} ) }
					</ul>
					{ mediaPlaceholder }
					<RichText
						tagName="figcaption"
						className={ captionClassNames }
						placeholder={ __( 'Write gallery caption…' ) }
						value={ caption }
						unstableOnFocus={ this.onFocusGalleryCaption }
						onChange={ ( value ) => setAttributes( { caption: value } ) }
						inlineToolbar
					/>
				</figure>
			</>
		);
	}
}
export default compose( [
	withSelect( ( select, { attributes: { ids } } ) => {
		const { getMedia } = select( 'core' );
		const { getSettings } = select( 'core/block-editor' );
		const {
			imageSizes,
			mediaUpload,
		} = getSettings();

		const resizedImages = reduce(
			ids,
			( currentResizedImages, id ) => {
				if ( ! id ) {
					return currentResizedImages;
				}
				const image = getMedia( id );
				const sizes = reduce( imageSizes, ( currentSizes, size ) => {
					const defaultUrl = get( image, [ 'sizes', size.slug, 'url' ] );
					const mediaDetailsUrl = get( image, [ 'media_details', 'sizes', size.slug, 'source_url' ] );
					return {
						...currentSizes,
						[ size.slug ]: defaultUrl || mediaDetailsUrl,
					};
				}, {} );
				return {
					...currentResizedImages,
					[ parseInt( id, 10 ) ]: sizes,
				};
			},
			{} );

		return {
			imageSizes,
			mediaUpload,
			resizedImages,
		};
	} ),
	withNotices,
] )( GalleryEdit );
