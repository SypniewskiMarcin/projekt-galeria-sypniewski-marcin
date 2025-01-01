import React, { createContext, useContext, useState } from 'react';

const EditingContext = createContext();

export const EditingProvider = ({ children }) => {
    const [editedPhotos, setEditedPhotos] = useState(new Map());
    
    const value = {
        editedPhotos,
        setEditedPhotos,
        // Dodamy więcej funkcji pomocniczych
    };

    return (
        <EditingContext.Provider value={value}>
            {children}
        </EditingContext.Provider>
    );
};

export const useEditing = () => useContext(EditingContext); 