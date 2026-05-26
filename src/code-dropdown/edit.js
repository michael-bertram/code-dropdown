import { __ } from '@wordpress/i18n';
import { useBlockProps, InnerBlocks, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ToggleControl, SelectControl } from '@wordpress/components';
import './editor.scss';

export default function Edit({ attributes, setAttributes }) {
    const { showLanguageBadge, codeLanguage } = attributes;

    const blockProps = useBlockProps({
        className: 'wp-block-wpe-code-dropdown-editor',
    });

    const languageOptions = [
        { label: 'PHP', value: 'PHP' },
        { label: 'JavaScript', value: 'JS' },
        { label: 'CSS', value: 'CSS' },
        { label: 'HTML', value: 'HTML' },
        { label: 'Python', value: 'Python' },
        { label: 'SQL', value: 'SQL' },
    ];

    return (
        <>
            {/* Sidebar Controls Panel Settings */}
            <InspectorControls>
                <PanelBody title={__('Code Display Settings', 'code-dropdown')} initialOpen={true}>
                    <ToggleControl
                        label={__('Show Language Badge', 'code-dropdown')}
                        checked={showLanguageBadge}
                        onChange={(value) => setAttributes({ showLanguageBadge: value })}
                    />
                    {showLanguageBadge && (
                        <SelectControl
                            label={__('Code Language', 'code-dropdown')}
                            value={codeLanguage}
                            options={languageOptions}
                            onChange={(value) => setAttributes({ codeLanguage: value })}
                        />
                    )}
                </PanelBody>
            </InspectorControls>

            {/* Structured Editor Canvas Container */}
            <div {...blockProps}>
                {/* 1. Header Layout Mock Layer */}
                <div className="editor-header-wrapper">
                    <span className="header-hint-label">{__('Header / Title', 'code-dropdown')}</span>
                    
                    {/* Live Badge Display on the right */}
                    {showLanguageBadge && (
                        <span className={`code-badge lang-${codeLanguage.toLowerCase()}`}>
                            {codeLanguage}
                        </span>
                    )}
                </div>

                {/* 2. Unified Nested Blocks Layout Stream */}
                <div className="editor-inner-blocks-container">
                    <InnerBlocks 
                        allowedBlocks={['wpe/code-header', 'wpe/code-content']}
                        template={[
                            ['wpe/code-header', {}],
                            ['wpe/code-content', {}]
                        ]}
                        templateLock="all"
                    />
                </div>
            </div>
        </>
    );
}