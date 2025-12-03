import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInAnonymously, 
    signInWithCustomToken, 
    onAuthStateChanged 
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    query, 
    addDoc, 
    updateDoc, 
    doc, 
    onSnapshot,
    serverTimestamp,
    getDocs,
    where
} from 'firebase/firestore';

// Lucide React Icons (replacing external libraries)
const BoxIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
);
const Share2Icon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
);
const ToolIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 15l4 4M21 12l-9-9-7 7-3 3 12 12 3-3 7-7 3-3zM21 12l-9-9M12 21l-9-9"/></svg>
);
const DropletIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.68 15.65v-3.8l5.44-5.46c.39-.39 1.02-.39 1.41 0s.39 1.02 0 1.41L14.1 13.2l3.22 3.22c.39.39.39 1.02 0 1.41s-1.02.39-1.41 0L12.68 15.65z"/><path d="M8.2 11.2L3.6 6.6c-.39-.39-.39-1.02 0-1.41s1.02-.39 1.41 0L9.6 9.8"/></svg>
);
const UserIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);
const TrophyIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19.8 8.1-.5.3-2.1 1.2a1.2 1.2 0 0 1-1.3-.2l-2.7-2.7a1.2 1.2 0 0 0-1.7 0l-2.7 2.7a1.2 1.2 0 0 1-1.3.2L4.7 8.4l-.5-.3A2 2 0 0 0 3 9.7V17a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7.3a2 2 0 0 0-1.2-1.7Z"/><path d="M12 19v3"/><path d="M6 15v-3"/><path d="M18 15v-3"/><path d="M12 6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/></svg>
);


// --- Firebase Setup and Custom Hooks ---

let db;
let auth;

const useFirebase = () => {
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [userId, setUserId] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        try {
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
            const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

            if (Object.keys(firebaseConfig).length === 0) {
                 throw new Error("Firebase config not available.");
            }

            const app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            auth = getAuth(app);

            // 1. Sign in or authenticate
            const handleAuth = async () => {
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                    } else {
                        await signInAnonymously(auth);
                    }
                } catch (e) {
                    console.error("Auth failed:", e);
                    setError("Authentication failed. Cannot connect to LocalLoop.");
                    // Fallback to anonymous sign-in if custom token fails
                    try {
                         await signInAnonymously(auth);
                    } catch (anonError) {
                         console.error("Anonymous sign-in failed:", anonError);
                         setError("Critical: Anonymous sign-in also failed.");
                    }
                } finally {
                    // Set the initial user state based on the result of the sign-in attempt
                    const user = auth.currentUser;
                    if (user) {
                        setUserId(user.uid);
                    } else {
                        // If all sign-in attempts fail, use a random ID as a fallback for userId
                        setUserId(crypto.randomUUID()); 
                    }
                    // Crucially, set isAuthReady *after* the sign-in attempts have completed
                    setIsAuthReady(true);
                }
            };

            // 2. Attach listener for subsequent state changes (e.g., sign out/re-auth)
            // This is kept separate from the initial, awaited sign-in logic
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                if (user) {
                    setUserId(user.uid);
                }
            });

            handleAuth();
            
            return () => unsubscribe();
        } catch (e) {
            console.error("Firebase Initialization Error:", e);
            setError(`Initialization Error: ${e.message}`);
        }
    }, []);

    return { isAuthReady, userId, db, auth, error };
};

const useLocalLoopItems = (db, isAuthReady, appId, userId) => {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dataError, setDataError] = useState(null);

    // Path for public/shared data: /artifacts/{appId}/public/data/items
    const getItemsCollectionRef = useCallback(() => {
        if (!db || !appId) return null;
        return collection(db, `artifacts/${appId}/public/data/items`);
    }, [db, appId]);

    useEffect(() => {
        // Only run the query if authentication is confirmed ready, the database is available, 
        // AND we have a stable userId (which means the user is signed in or a fallback ID is assigned).
        if (!isAuthReady || !db || !userId) return;

        const itemsRef = getItemsCollectionRef();
        if (!itemsRef) return;

        // Fetch items in real-time
        const unsubscribe = onSnapshot(itemsRef, (snapshot) => {
            const itemsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toMillis() || Date.now()
            })).sort((a, b) => b.timestamp - a.timestamp); // Sort newest first
            
            setItems(itemsList);
            setIsLoading(false);
        }, (error) => {
            // Log the error but continue to display the UI
            console.error("Error fetching items:", error);
            setDataError("Failed to load community items in real-time. Check console for permissions error.");
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [isAuthReady, db, userId, getItemsCollectionRef]);

    return { items, isLoading, dataError, getItemsCollectionRef };
};

const useGamification = (db, isAuthReady, appId, userId, items) => {
    const [loopPoints, setLoopPoints] = useState(0);
    const [sharedCount, setSharedCount] = useState(0);
    const [claimedCount, setClaimedCount] = useState(0);
    const [badge, setBadge] = useState('New Neighbor');

    useEffect(() => {
        if (!isAuthReady || !userId) return;

        // Calculate metrics based on the current items list
        const userItems = items.filter(item => item.postedBy === userId);
        const shared = userItems.length;
        
        // Count items claimed/borrowed by the current user
        const claimed = items.filter(item => item.claimedBy === userId).length;

        setSharedCount(shared);
        setClaimedCount(claimed);
        
        // Simple point system: 10 points per share, 5 points per claim
        const points = (shared * 10) + (claimed * 5);
        setLoopPoints(points);

        // Simple badge system
        if (shared >= 10) {
            setBadge('Community Hub');
        } else if (shared >= 3) {
            setBadge('Active Sharer');
        } else if (claimed >= 5) {
            setBadge('Resourceful Loopster');
        } else {
            setBadge('New Neighbor');
        }

    }, [items, isAuthReady, userId]);

    return { loopPoints, sharedCount, claimedCount, badge };
};


// --- Core Components ---

const Header = ({ userId }) => {
    return (
        <header className="bg-emerald-600 p-4 text-white shadow-lg">
            <div className="container mx-auto flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-tight flex items-center">
                    <DropletIcon className="w-6 h-6 mr-2" />
                    LocalLoop
                </h1>
                {/* Displaying the full userId is MANDATORY for multi-user apps */}
                <div className="text-sm opacity-80 flex items-center p-1 bg-emerald-700/50 rounded-full">
                    <UserIcon className="w-4 h-4 mr-1" />
                    <span className='hidden sm:inline-block'>User ID: </span>
                    <span className="font-mono text-xs ml-1">
                        {userId || 'Loading...'}
                    </span>
                </div>
            </div>
        </header>
    );
};

const TabButton = ({ isActive, icon: Icon, label, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-1 p-3 flex flex-col items-center justify-center transition-all duration-300 rounded-lg ${
            isActive
                ? 'bg-white text-emerald-700 shadow-md border-b-4 border-emerald-500'
                : 'text-gray-600 hover:bg-gray-100'
        }`}
    >
        <Icon className="w-5 h-5 mb-1" />
        <span className="text-xs font-medium hidden sm:inline">{label}</span>
    </button>
);


const ItemCard = ({ item, userId, handleAction }) => {
    const isOwner = item.postedBy === userId;
    const isAvailable = item.status === 'Available';
    const isClaimable = isAvailable && !isOwner;

    const actionText = item.type === 'Surplus' ? 'Claim Drop' : 'Borrow Tool';
    const actionStatus = item.type === 'Surplus' ? 'Claimed' : 'Borrowed';

    let statusColor = 'bg-green-100 text-green-700';
    if (item.status === 'Claimed' || item.status === 'Borrowed') {
        statusColor = 'bg-yellow-100 text-yellow-700';
    } else if (item.status === 'Completed') {
        statusColor = 'bg-blue-100 text-blue-700';
    }

    const ItemIcon = item.type === 'Surplus' ? DropletIcon : ToolIcon;

    const handleItemAction = () => {
        handleAction(item.id, actionStatus);
    }

    return (
        <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 flex flex-col sm:flex-row justify-between transition duration-300 hover:shadow-xl">
            <div className="flex items-start mb-3 sm:mb-0">
                <div className={`p-3 rounded-full mr-4 ${item.type === 'Surplus' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                    <ItemIcon className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">{item.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusColor}`}>
                        {item.status}
                    </span>
                </div>
            </div>
            <div className="flex flex-col items-start sm:items-end justify-between">
                 <p className="text-xs text-gray-400 mt-2 sm:mt-0">
                    Posted by: <span className="font-mono">{item.postedBy.substring(0, 8)}...</span>
                </p>
                {isClaimable && (
                    <button
                        onClick={handleItemAction}
                        className="mt-3 w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200"
                    >
                        {actionText}
                    </button>
                )}
                {isOwner && isAvailable && (
                    <button
                        disabled
                        className="mt-3 w-full sm:w-auto bg-gray-300 text-gray-600 font-bold py-2 px-4 rounded-lg cursor-not-allowed"
                    >
                        Your Post (Available)
                    </button>
                )}
                 {!isAvailable && (
                    <button
                        disabled
                        className="mt-3 w-full sm:w-auto bg-yellow-500 text-white font-bold py-2 px-4 rounded-lg cursor-not-allowed"
                    >
                        {actionStatus} by a neighbor
                    </button>
                )}
            </div>
        </div>
    );
};

const ItemList = ({ items, userId, handleAction, isLoading, dataError }) => {
    if (isLoading) {
        return <div className="text-center p-8 text-gray-500">Loading community loops...</div>;
    }

    if (dataError) {
         return <div className="text-center p-8 text-red-500 bg-red-50 rounded-xl">{dataError}</div>;
    }

    if (items.length === 0) {
        return <div className="text-center p-8 text-gray-500 bg-gray-50 rounded-xl">No surplus or tools posted yet! Be the first to start the Loop.</div>;
    }

    return (
        <div className="space-y-4">
            {items.map(item => (
                <ItemCard key={item.id} item={item} userId={userId} handleAction={handleAction} />
            ))}
        </div>
    );
};

const PostItemForm = ({ db, userId, getItemsCollectionRef, onPostSuccess }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('Surplus'); // 'Surplus' or 'Lend/Borrow'
    const [isPosting, setIsPosting] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || !description || !userId) {
            setMessage('Please fill out all fields.');
            return;
        }

        setIsPosting(true);
        setMessage('');

        const itemsRef = getItemsCollectionRef();
        if (!itemsRef) {
            setMessage('Error: Database connection not ready.');
            setIsPosting(false);
            return;
        }

        try {
            await addDoc(itemsRef, {
                name,
                description,
                type,
                postedBy: userId,
                status: 'Available', // Initial status
                timestamp: serverTimestamp(),
            });

            setMessage(`Successfully posted "${name}" to the Loop!`);
            setName('');
            setDescription('');
            setType('Surplus');
            onPostSuccess(); // Switch tab back to exchange
        } catch (e) {
            console.error("Error adding document: ", e);
            setMessage('Error posting item. Check console for details.');
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Contribute to the Loop</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex space-x-4">
                    <button
                        type="button"
                        onClick={() => setType('Surplus')}
                        className={`flex-1 py-3 rounded-lg font-semibold transition-all duration-200 ${
                            type === 'Surplus'
                                ? 'bg-amber-500 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-amber-100'
                        }`}
                    >
                        <DropletIcon className="inline w-5 h-5 mr-2" /> Surplus Drop (Free)
                    </button>
                    <button
                        type="button"
                        onClick={() => setType('Lend/Borrow')}
                        className={`flex-1 py-3 rounded-lg font-semibold transition-all duration-200 ${
                            type === 'Lend/Borrow'
                                ? 'bg-blue-500 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-blue-100'
                        }`}
                    >
                        <ToolIcon className="inline w-5 h-5 mr-2" /> Lend/Borrow Library
                    </button>
                </div>

                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Item Name</label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 border"
                        placeholder={type === 'Surplus' ? 'E.g., Half-dozen fresh eggs' : 'E.g., Cordless Drill & bits'}
                    />
                </div>
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Details / Instructions</label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        rows="3"
                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 border"
                        placeholder={type === 'Surplus' ? 'When/where to pick up, expiration date.' : 'Terms of borrowing, condition, return date.'}
                    ></textarea>
                </div>

                <button
                    type="submit"
                    disabled={isPosting}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isPosting ? 'Posting...' : `Post ${type === 'Surplus' ? 'Drop' : 'Tool'}`}
                </button>
                {message && (
                    <p className={`mt-3 text-sm font-medium ${message.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{message}</p>
                )}
            </form>
        </div>
    );
};


const GamificationView = ({ loopPoints, sharedCount, claimedCount, badge }) => {
    
    const getBadgeStyle = (currentBadge) => {
        switch (currentBadge) {
            case 'Community Hub':
                return 'bg-purple-100 text-purple-700 border-purple-500';
            case 'Active Sharer':
                return 'bg-emerald-100 text-emerald-700 border-emerald-500';
            case 'Resourceful Loopster':
                return 'bg-blue-100 text-blue-700 border-blue-500';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-500';
        }
    };

    const getNextBadgeGoal = () => {
        if (sharedCount < 3) return { goal: 3, name: 'Active Sharer' };
        if (sharedCount < 10) return { goal: 10, name: 'Community Hub' };
        return { goal: 'Max', name: 'Master Loop' };
    };

    const nextGoal = getNextBadgeGoal();

    return (
        <div className="max-w-3xl mx-auto space-y-8 p-4">
            <h2 className="text-3xl font-extrabold text-gray-800 flex items-center">
                <TrophyIcon className="w-8 h-8 mr-2 text-yellow-500" />
                My Loop Recognition
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Loop Points" value={loopPoints} icon={BoxIcon} color="text-yellow-600" bgColor="bg-yellow-50" />
                <StatCard title="Items Shared" value={sharedCount} icon={Share2Icon} color="text-emerald-600" bgColor="bg-emerald-50" />
                <StatCard title="Items Claimed/Borrowed" value={claimedCount} icon={UserIcon} color="text-blue-600" bgColor="bg-blue-50" />
            </div>

            <div className="p-6 rounded-xl shadow-xl bg-white border-t-4 border-emerald-500">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Current Badge</h3>
                <div className={`p-4 inline-block rounded-full border-2 font-bold ${getBadgeStyle(badge)}`}>
                    {badge}
                </div>
                
                {nextGoal.goal !== 'Max' && (
                    <div className="mt-4">
                        <p className="text-gray-600 mb-2">Next Goal: Earn the "{nextGoal.name}" Badge</p>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                                className="bg-emerald-500 h-2.5 rounded-full transition-all duration-700" 
                                style={{ width: `${Math.min((sharedCount / nextGoal.goal) * 100, 100)}%` }}
                            ></div>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{sharedCount} / {nextGoal.goal} items shared</p>
                    </div>
                )}
            </div>
            
            <BadgeGuide />
        </div>
    );
};

const StatCard = ({ title, value, icon: Icon, color, bgColor }) => (
    <div className={`p-5 rounded-xl shadow-md flex items-center space-x-4 ${bgColor}`}>
        <div className={`p-3 rounded-full ${color} ${bgColor.replace('50', '200')}`}>
            <Icon className="w-6 h-6" />
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
    </div>
);

const BadgeGuide = () => (
    <div className="p-6 bg-white rounded-xl shadow-xl border-l-4 border-blue-500">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Badge Requirements</h3>
        <ul className="space-y-2 text-gray-600 list-disc list-inside">
            <li><span className="font-bold text-gray-800">New Neighbor:</span> Default status.</li>
            <li><span className="font-bold text-emerald-700">Active Sharer:</span> Share 3 or more items.</li>
            <li><span className="font-bold text-blue-700">Resourceful Loopster:</span> Claim/Borrow 5 or more items.</li>
            <li><span className="font-bold text-purple-700">Community Hub:</span> Share 10 or more items.</li>
        </ul>
    </div>
);

// --- Main App Component ---

const App = () => {
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const { isAuthReady, userId, db, error } = useFirebase();
    const { items, isLoading, dataError, getItemsCollectionRef } = useLocalLoopItems(db, isAuthReady, appId, userId);
    const { loopPoints, sharedCount, claimedCount, badge } = useGamification(db, isAuthReady, appId, userId, items);
    const [activeTab, setActiveTab] = useState('Exchange'); // 'Exchange', 'Post', 'MyLoop'

    const handleItemAction = async (itemId, newStatus) => {
        if (!db || !userId) return;

        const itemRef = doc(db, `artifacts/${appId}/public/data/items`, itemId);
        try {
            await updateDoc(itemRef, {
                status: newStatus,
                claimedBy: userId,
                claimedAt: serverTimestamp()
            });
            console.log(`Item ${itemId} updated to ${newStatus} by user ${userId}`);
        } catch (e) {
            console.error("Error updating item status:", e);
        }
    };

    if (error) {
        return <div className="p-8 text-center text-red-700 bg-red-100 rounded-lg m-4 shadow-xl">
            <h2 className="font-bold">Initialization Error</h2>
            <p>{error}</p>
            <p className="mt-2 text-sm">Please ensure Firebase variables are correctly set in the environment.</p>
        </div>
    }

    if (!isAuthReady) {
        return <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="text-center p-8 bg-white rounded-xl shadow-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-3"></div>
                <p className="text-gray-600 font-medium">Connecting to LocalLoop network...</p>
            </div>
        </div>
    }

    return (
        <div className="min-h-screen bg-gray-50 font-[Inter]">
            <Header userId={userId} />

            <div className="sticky top-0 z-10 bg-white shadow-md p-2">
                <div className="container mx-auto flex justify-around space-x-2 max-w-lg">
                    <TabButton
                        isActive={activeTab === 'Exchange'}
                        icon={BoxIcon}
                        label="Exchange"
                        onClick={() => setActiveTab('Exchange')}
                    />
                    <TabButton
                        isActive={activeTab === 'Post'}
                        icon={Share2Icon}
                        label="Post Item"
                        onClick={() => setActiveTab('Post')}
                    />
                    <TabButton
                        isActive={activeTab === 'MyLoop'}
                        icon={TrophyIcon}
                        label="My Loop"
                        onClick={() => setActiveTab('MyLoop')}
                    />
                </div>
            </div>

            <main className="container mx-auto p-4 md:p-8">
                {activeTab === 'Exchange' && (
                    <div className="space-y-6">
                        <h2 className="text-3xl font-bold text-gray-800">Community Exchange</h2>
                        <ItemList 
                            items={items} 
                            userId={userId} 
                            handleAction={handleItemAction} 
                            isLoading={isLoading}
                            dataError={dataError}
                        />
                    </div>
                )}

                {activeTab === 'Post' && (
                    <PostItemForm 
                        db={db} 
                        userId={userId} 
                        getItemsCollectionRef={getItemsCollectionRef} 
                        onPostSuccess={() => setActiveTab('Exchange')}
                    />
                )}

                {activeTab === 'MyLoop' && (
                    <GamificationView 
                        loopPoints={loopPoints} 
                        sharedCount={sharedCount} 
                        claimedCount={claimedCount} 
                        badge={badge} 
                    />
                )}
            </main>

            <footer className="p-4 text-center text-sm text-gray-500">
                <p>LocalLoop v1.0 | Powered by Firestore Realtime Sync</p>
            </footer>
        </div>
    );
};

export default App;