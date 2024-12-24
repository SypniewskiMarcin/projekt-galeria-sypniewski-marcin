import React from 'react';

const ViewToggle = ({ currentView, onViewChange }) => {
    return (
        <div className="view-toggle">
            <select 
                value={currentView} 
                onChange={(e) => onViewChange(e.target.value)}
                className="view-select"
                aria-label="Wybierz sposób wyświetlania zdjęć"
            >
                <option value="square">Miniaturki kwadratowe</option>
                <option value="natural">Naturalne proporcje</option>
            </select>
        </div>
    );
};

export default ViewToggle; 