import React from 'react';

const EditingTools = ({ adjustments, onChange, onAIEnhance, isAIProcessing }) => {
    const tools = [
        { name: 'brightness', label: 'Jasność', min: 0, max: 200 },
        { name: 'contrast', label: 'Kontrast', min: 0, max: 200 },
        { name: 'saturation', label: 'Nasycenie', min: 0, max: 200 },
        { name: 'exposure', label: 'Ekspozycja', min: -100, max: 100 },
        { name: 'highlights', label: 'Światła', min: -100, max: 100 },
        { name: 'shadows', label: 'Cienie', min: -100, max: 100 },
        { name: 'temperature', label: 'Temperatura', min: -100, max: 100 },
        { name: 'clarity', label: 'Klarowność', min: -100, max: 100 },
        { name: 'blur', label: 'Rozmycie', min: 0, max: 20 },
        { name: 'sharpen', label: 'Wyostrzenie', min: 0, max: 100 }
    ];

    return (
        <div className="editing-tools">
            <div className="ai-enhancement-section">
                <button
                    className={`ai-enhance-button ${isAIProcessing ? 'processing' : ''}`}
                    onClick={onAIEnhance}
                    disabled={isAIProcessing}
                >
                    {isAIProcessing ? 'Przetwarzanie...' : 'Ulepsz z AI'}
                </button>
                {isAIProcessing && (
                    <div className="processing-indicator">
                        <div className="spinner"></div>
                        <span>Przetwarzanie obrazu z użyciem AI...</span>
                    </div>
                )}
            </div>

            {tools.map(tool => (
                <div key={tool.name} className="tool-group">
                    <label htmlFor={tool.name}>{tool.label}</label>
                    <div className="tool-controls">
                        <input
                            type="range"
                            id={tool.name}
                            min={tool.min}
                            max={tool.max}
                            value={adjustments[tool.name]}
                            onChange={e => onChange(tool.name, parseInt(e.target.value))}
                        />
                        <span className="tool-value">{adjustments[tool.name]}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default EditingTools; 