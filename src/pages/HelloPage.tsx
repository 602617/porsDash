import React from 'react';
import { Link } from 'react-router-dom';

const HelloPage: React.FC = () => {



return (
    <div>
        <h1>Velkommen</h1>
        <Link to="/login" className="text-blue-600 hover:underline">
            Log In  
        </Link>
    </div>
)
};

export default HelloPage;