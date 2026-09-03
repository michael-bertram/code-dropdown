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
        highlightLines,
        isDarkMode, 
        isCompact,
        maxHeight,
        showLineNumbers,
        fontSize 
    } = attributes;

    // AI Auto-Fill Async State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiError, setAiError] = useState(null);

    // Dispatcher for child block attribute mutations
    const { updateBlockAttributes } = useDispatch('core/block-editor');

    // 1. DYNAMIC DATA HOOK: Optimized registry queries to prevent re-render performance leaks
    const { cleanRawText, lineCount, headerBlockId } = useSelect((select) => {
        const { getBlockOrder, getBlock } = select('core/block-editor');
        const innerBlockIds = getBlockOrder(clientId);
        
        let contentBlock = null;
        let headerBlock = null;

        for (const id of innerBlockIds) {
            const block = getBlock(id);
            if (!block) continue;
            if (block.name === 'wpe/code-content') contentBlock = block;
            if (block.name === 'wpe/code-header') headerBlock = block;
        }
        
        if (!contentBlock) {
            return { cleanRawText: '', lineCount: 1, headerBlockId: headerBlock?.clientId || null };
        }

        const rawContent = contentBlock.attributes?.content || 
                             contentBlock.attributes?.code || 
                             contentBlock.attributes?.value || 
                             '';

        const textWithNewlines = rawContent
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p><p>/gi, '\n')
            .replace(/<\/div><div>/gi, '\n');

        const cleanText = textWithNewlines.replace(/<[^>]*>/g, '');
        const linesArray = cleanText.split('\n');
        const calculatedLines = cleanText.trim() ? linesArray.length : 1;

        return {
            cleanRawText: cleanText,
            lineCount: calculatedLines,
            headerBlockId: headerBlock?.clientId || null
        };
    }, [clientId]);

    const characterCount = cleanRawText.replace(/\r/g, '').length;

    // 2. ABILITIES API DISPATCHER (Step 2 Implementation)
    const handleAutoFill = async () => {
        if (!cleanRawText || !cleanRawText.trim()) {
            setAiError(__('Please enter some code into the block first.', 'code-dropdown'));
            return;
        }

        setIsAnalyzing(true);
        setAiError(null);

        try {
            let response;
            try {
                // Primary Path: Abilities API REST Controller
                response = await apiFetch({
                    path: '/wp/v2/abilities/code-dropdown/auto-fill-metadata/run',
                    method: 'POST',
                    data: { code: cleanRawText },
                });
            } catch (routeErr) {
                // Fallback Path: Direct Plugin REST Endpoint
                if (routeErr.code === 'rest_no_route' || routeErr.status === 404) {
                    response = await apiFetch({
                        path: '/code-dropdown/v1/auto-fill-metadata',
                        method: 'POST',
                        data: { code: cleanRawText },
                    });
                } else {
                    throw routeErr;
                }
            }

            // Sync AI response attributes (Metadata + Syntax Formatting)
            setAttributes({
                codeLanguage: response.codeLanguage || codeLanguage,
                filename: response.filename || filename,
                highlightLines: response.highlightLines ?? highlightLines,
                showLineNumbers: response.showLineNumbers ?? showLineNumbers,
            });

            // Update title on child header block (wpe/code-header)
            if (headerBlockId && response.title) {
                updateBlockAttributes(headerBlockId, {
                    title: response.title,
                });
            }

        } catch (err) {
            const rawMessage = err.message || __('Failed to auto-fill metadata.', 'code-dropdown');
            const cleanMessage = rawMessage.includes('<p>') 
                ? __('Server error occurred during execution. Check WP debug log.', 'code-dropdown') 
                : rawMessage;
            setAiError(cleanMessage);
        } finally {
            setIsAnalyzing(false);
        }
    };

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
                {/* AI Automation Panel */}
                <PanelBody title={__('AI Utilities', 'code-dropdown')} initialOpen={true}>
                    <Button
                        variant="secondary"
                        isBusy={isAnalyzing}
                        disabled={isAnalyzing || !cleanRawText.trim()}
                        onClick={handleAutoFill}
                        style={{ width: '100%', justifyContent: 'center', marginBottom: '12px' }}
                    >
                        {isAnalyzing ? <Spinner /> : __('Auto-Fill Details & Syntax (AI)', 'code-dropdown')}
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
                    <TextControl
                        label={__('Highlight Lines (e.g., 3, 5-8)', 'code-dropdown')}
                        value={highlightLines || ''}
                        onChange={(value) => setAttributes({ highlightLines: value })}
                        help={__('Comma-separated line numbers or ranges to highlight.', 'code-dropdown')}
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
                                { label: 'JSON', value: 'JSON' },
                                { label: 'SQL', value: 'SQL' },
                                { label: 'Bash', value: 'Bash' },
                            ]}
                            onChange={(value) => setAttributes({ codeLanguage: value })}
                        />
                    )}
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