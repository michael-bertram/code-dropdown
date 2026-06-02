import { __ } from '@wordpress/i18n';
import { useBlockProps, InnerBlocks, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ToggleControl, SelectControl } from '@wordpress/components';
import { useSelect } from '@wordpress/data'; 
import './editor.scss';

export default function Edit({ attributes, setAttributes, clientId }) {
    const { 
        showLanguageBadge, 
        codeLanguage, 
        isDarkMode, 
        isCompact,
        maxHeight,
        showLineNumbers,
        fontSize 
    } = attributes;

    // 1. DYNAMIC DATA HOOK: Track content variations live from the editor registry
    const { cleanRawText, lineCount } = useSelect((select) => {
        const { getBlocks } = select('core/block-editor');
        const innerBlocks = getBlocks(clientId);
        const contentBlock = innerBlocks.find(block => block.name === 'wpe/code-content');
        
        if (!contentBlock) {
            return { cleanRawText: '', lineCount: 1 };
        }

        // Pull active text values safely out of fallback attribute variants
        const rawContent = contentBlock.attributes?.content || 
                             contentBlock.attributes?.code || 
                             contentBlock.attributes?.value || 
                             '';

        // Format dynamic line elements to calculate totals accurately
        const textWithNewlines = rawContent
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p><p>/gi, '\n')
            .replace(/<\/div><div>/gi, '\n');

        const cleanText = textWithNewlines.replace(/<[^>]*>/g, '');
        const linesArray = cleanText.split('\n');
        
        // Dynamically compute lines array tracking sizes safely
        const calculatedLines = cleanText.trim() ? linesArray.length : 1;

        return {
            cleanRawText: cleanText,
            lineCount: calculatedLines
        };
    }, [clientId]);

    const characterCount = cleanRawText.replace(/\r/g, '').length;

    // 2. Bind layout attributes to structural wrapper metadata classes
    const blockProps = useBlockProps({
        className: `wp-block-wpe-code-dropdown-editor ${isDarkMode ? 'dark-theme' : ''} ${isCompact ? 'is-compact' : ''} ${showLineNumbers ? 'has-line-numbers' : ''}`,
        style: { 
            '--editor-code-font-size': fontSize,
            '--panel-max-height': maxHeight
        }
    });

    const maxHeightOptions = [
        { label: 'No Limit (Scroll disabled)', value: 'none' },
        { label: 'Short (250px)', value: '250px' },
        { label: 'Medium (400px)', value: '400px' },
        { label: 'Tall (600px)', value: '600px' },
    ];

    const fontSizeOptions = [
        { label: 'Small (12px)', value: '12px' },
        { label: 'Normal (14px)', value: '14px' },
        { label: 'Medium (16px)', value: '16px' },
        { label: 'Large (18px)', value: '18px' },
    ];

    return (
        <>
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
                            options={[
                                { label: 'PHP', value: 'PHP' },
                                { label: 'JavaScript', value: 'JS' },
                                { label: 'CSS', value: 'CSS' },
                                { label: 'HTML', value: 'HTML' },
                            ]}
                            onChange={(value) => setAttributes({ codeLanguage: value })}
                        />
                    )}
                </PanelBody>

                <PanelBody title={__('Design & Layout', 'code-dropdown')} initialOpen={true}>
                    <ToggleControl
                        label={__('Use Dark Theme', 'code-dropdown')}
                        checked={isDarkMode}
                        onChange={(value) => setAttributes({ isDarkMode: value })}
                    />
                    <ToggleControl
                        label={__('Compact Spacing Layout', 'code-dropdown')}
                        checked={isCompact}
                        disabled={showLineNumbers} // Disable compact mode if line numbers are enabled to prevent layout issues
                        onChange={(value) => setAttributes({ isCompact: value })}
                        help={showLineNumbers ? __('Compact mode is disabled when line numbers are enabled.', 'code-dropdown') : ''}
                    />
                    <ToggleControl
                        label={__('Show Line Numbers', 'code-dropdown')}
                        checked={showLineNumbers}
                        onChange={(value) => {
                            if (value && isCompact) {
                                // If enabling line numbers while compact mode is active, disable compact mode to prevent layout issues
                                setAttributes({ showLineNumbers: value, isCompact: false });
                            } else {
                                setAttributes({ showLineNumbers: value });
                            }
                        }}
                    />
                    <SelectControl
                        label={__('Max Panel Height', 'code-dropdown')}
                        value={maxHeight}
                        options={maxHeightOptions}
                        onChange={(value) => setAttributes({ maxHeight: value })}
                    />
                    <SelectControl
                        label={__('Code Font Size', 'code-dropdown')}
                        value={fontSize}
                        options={fontSizeOptions}
                        onChange={(value) => setAttributes({ fontSize: value })}
                    />
                </PanelBody>
            </InspectorControls>

            <div {...blockProps}>
                <div className="editor-combined-container">
                    
                    {showLanguageBadge && (
                        <span className={`code-badge lang-${codeLanguage.toLowerCase()}`}>
                            {codeLanguage}
                        </span>
                    )}

                    <div className="editor-inner-blocks-wrapper">
                        <InnerBlocks 
                            allowedBlocks={['wpe/code-header', 'wpe/code-content']}
                            template={[['wpe/code-header', {}], ['wpe/code-content', {}]]}
                            templateLock="all"
                        />
                        
                        {/* Dynamic Floating Gutter Injection Layer inside the block layout */}
                        {showLineNumbers && (
                            <div className="line-numbers-gutter" aria-hidden="true">
                                {Array.from({ length: lineCount }).map((_, index) => (
                                    <span key={index}>{index + 1}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="code-footer">
                        <div className="code-analytics-meta">
                            <span>{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
                            <span className="meta-divider">•</span>
                            <span>{characterCount.toLocaleString()} chars</span>
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
}