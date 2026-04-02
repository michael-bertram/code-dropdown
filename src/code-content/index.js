import { registerBlockType } from '@wordpress/blocks';
import Edit from './edit';
import Save from './save';

registerBlockType('bigbite/task-content', {
  edit: Edit,
  save: Save,
});
