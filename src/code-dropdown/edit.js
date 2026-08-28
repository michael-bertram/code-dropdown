import { __ } from '@wordpress/i18n';
import { useBlockProps, InnerBlocks, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ToggleControl, SelectControl, Button, Spinner, TextControl } from '@wordpress/components';
import { useSelect, useDispatch } from '@wordpress/data'; 
import { useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import './editor.scss';

export default function Edit({ attributes, setAttributes, clientId }) {
    const { 
        showLanguageBadge, 
        codeLanguage, 
        filename,
        isDarkMode, 
        isCompact,
        maxHeight,
        showLineNumbers,
        fontSize 
    } = attributes;

    // AI Auto-Fill Async UI State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiError, setAiError] = useState(null);

    // Dispatcher to update child block attributes (e.g. wpe/code-header)
    const { updateBlockAttributes } = useDispatch('core/block-editor');

    // 1. DYNAMIC DATA HOOK: Track content variations live from the editor registry
    const { cleanRawText, lineCount, headerBlockId } = useSelect((select) => {
        const { getBlocks } = select('core/block-editor');
        const innerBlocks = getBlocks(clientId);
        
        const contentBlock = innerBlocks.find(block => block.name === 'wpe/code-content');
        const headerBlock = innerBlocks.find(block => block.name === 'wpe/code-header');
        
        if (!contentBlock) {
            return { cleanRawText: '', lineCount: 1, headerBlockId: headerBlock?.clientId || null };
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
            lineCount: calculatedLines,
            headerBlockId: headerBlock?.clientId || null
        };
    }, [clientId]);

    const characterCount = cleanRawText.replace(/\r/g, '').length;

    // 2. AI ABILITIES API DISPATCHER (Phase 1)
    const handleAutoFill = async () => {
        if (!cleanRawText.trim()) {
            setAiError(__('Please enter some code into the snippet block first.', 'code-dropdown'));
            return;
        }

        setIsAnalyzing(true);
        setAiError(null);

        try {
            const response = await apiFetch({
                path: '/wp-json/wp/v2/abilities/code-dropdown/auto-fill-metadata/run',
                method: 'POST',
                data: {
                    code: cleanRawText,
                },
            });

            // Update parent block attributes
            setAttributes({
                codeLanguage: response.codeLanguage || codeLanguage,
                filename: response.filename || filename,
            });

            // If a header child block exists, update its title attribute dynamically
            if (headerBlockId && response.title) {
                updateBlockAttributes(headerBlockId, {
                    title: response.title,
                });
            }

        } catch (err) {
            setAiError(
                err.message || __('Failed to auto-fill metadata via Abilities API.', 'code-dropdown')
            );
        } finally {
            setIsAnalyzing(false);
        }
    };

    // 3. Bind layout attributes to structural wrapper metadata classes
    const blockProps = useBlockProps({
        className: `wp-block-wpe-code-dropdown-editor ${isDarkMode ? 'dark-theme' : ''} ${isCompact ? 'is-compact' : ''} ${showLineNumbers ? 'has-line-numbers' : ''}`,
        style: { 
            '--editor-code-font-size': fontSize,
            '--panel-max-height': maxHeight
        }
    });

    const maxHeightOptions = [
        { label: __('No Limit (Scroll disabled)', 'code-dropdown'), value: 'none' },
        { label: __('Short (250px)', 'code-dropdown'), value: '250px' },
        { label: __('Medium (400px)', 'code-dropdown'), value: '400px' },
        { label: __('Tall (600px)', 'code-dropdown'), value: '600px' },
    ];

    const fontSizeOptions = [
        { label: __('Small (12px)', 'code-dropdown'), value: '12px' },
        { label: __('Normal (14px)', 'code-dropdown'), value: '14px' },
        { label: __('Medium (16px)', 'code-dropdown'), value: '16px' },
        { label: __('Large (18px)', 'code-dropdown'), value: '18px' },
    ];

    return (
        <>
            <InspectorControls>
                {/* AI Automation Panel (WordPress Abilities API Integration) */}
                <PanelBody title={__('AI Utilities', 'code-dropdown')} initialOpen={true}>
                    <Button
                        variant="secondary"
                        isBusy={isAnalyzing}
                        disabled={isAnalyzing || !cleanRawText.trim()}
                        onClick={handleAutoFill}
                        style={{ width: '100%', justifyContent: 'center', marginBottom: '12px' }}
                    >
                        {isAnalyzing ? <Spinner /> : __('Auto-Fill Block Details (AI)', 'code-dropdown')}
                    </Button>

                    {aiError && (
                        <p style={{ color: '#cc1818', fontSize: '12px', marginBottom: '12px' }}>{aiError}</p>
                    )}

                    <TextControl
                        label={__('Filename / Label', 'code-dropdown')}
                        value={filename || ''}
                        onChange={(value) => setAttributes({ filename: value })}
                        help={__('Idiomatic filename auto-generated by AI or specified manually.', 'code-dropdown')}
                    />
                </PanelBody>

                <PanelBody title={__('Code Display Settings', 'code-dropdown')} initialOpen={false}>
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
                                { label: 'SQL', value: 'SQL' },
                                { label: 'Bash', value: 'Bash' },
                            ]}
                            onChange={(value) => setAttributes({ codeLanguage: value })}
                            help={__('Select the programming language. This will be displayed in the badge and can assist with syntax highlighting.', 'code-dropdown')}
                        />
                    )}
                </PanelBody>

                <PanelBody title={__('Design & Layout', 'code-dropdown')} initialOpen={false}>
                    <ToggleControl
                        label={__('Use Dark Theme', 'code-dropdown')}
                        checked={isDarkMode}
                        onChange={(value) => setAttributes({ isDarkMode: value })}
                    />
                    <ToggleControl
                        label={__('Compact Spacing Layout', 'code-dropdown')}
                        checked={isCompact}
                        disabled={showLineNumbers}
                        onChange={(value) => setAttributes({ isCompact: value })}
                        help={showLineNumbers ? __('Compact mode is disabled when line numbers are enabled.', 'code-dropdown') : ''}
                    />
                    <ToggleControl
                        label={__('Show Line Numbers', 'code-dropdown')}
                        checked={showLineNumbers}
                        onChange={(value) => {
                            if (value && isCompact) {
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
                        <span className={`code-badge lang-${(codeLanguage || 'php').toLowerCase()}`}>
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