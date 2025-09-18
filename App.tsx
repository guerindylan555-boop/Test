
import React, { useState, useEffect, useCallback, useMemo, FC, ChangeEvent } from 'react';
import type { User, AppSettings, Listing, GarmentType, Gender, Pose, Environment, GenerationSettings, GeneratedImage } from './types';
import { GarmentType as GarmentTypeEnum, Gender as GenderEnum, Pose as PoseEnum, Environment as EnvironmentEnum } from './types';
import { generateOnModelImage, generateTextualDescription } from './services/geminiService';

// UTILS - Normally in a separate file
const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const classNames = (...classes: (string | boolean | undefined)[]) => {
  return classes.filter(Boolean).join(' ')
}

// ICONS - Normally in a separate component file
const PhotoIcon: FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
);
const XMarkIcon: FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);
const SparklesIcon: FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
);

// MOCK LOCAL STORAGE API - Simulates a backend
const useMockApi = () => {
    const [listings, setListings] = useState<Listing[]>([]);
    
    useEffect(() => {
        const storedListings = localStorage.getItem('vintedboost_listings');
        if (storedListings) {
            setListings(JSON.parse(storedListings));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('vintedboost_listings', JSON.stringify(listings));
    }, [listings]);

    const getListingsForUser = useCallback((userId: string) => {
        return listings.filter(l => l.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [listings]);

    const createListing = useCallback(async (userId: string, sourceImageFile: File, settings: GenerationSettings): Promise<Listing> => {
        const sourceImageUrl = await fileToDataUrl(sourceImageFile);
        const newListing: Listing = {
            id: `listing_${Date.now()}`,
            userId,
            sourceImage: { name: sourceImageFile.name, url: sourceImageUrl },
            settings,
            generatedImages: [],
            createdAt: new Date().toISOString(),
        };
        setListings(prev => [newListing, ...prev]);
        return newListing;
    }, []);

    const addImageToListing = useCallback((listingId: string, image: GeneratedImage) => {
        setListings(prev => prev.map(l => {
            if (l.id === listingId) {
                const updatedListing = { ...l, generatedImages: [...l.generatedImages, image] };
                 if (!updatedListing.coverImageS3Key) {
                    updatedListing.coverImageS3Key = image.s3_key;
                }
                return updatedListing;
            }
            return l;
        }));
    }, []);

    const getListingById = useCallback((listingId: string) => {
        return listings.find(l => l.id === listingId);
    }, [listings]);

    return { getListingsForUser, createListing, addImageToListing, getListingById };
};


// UI COMPONENTS

const Button: FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' }> = ({ children, className, variant = 'primary', ...props }) => {
    const baseClasses = "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:pointer-events-none";
    const variantClasses = {
        primary: 'bg-brand-primary text-white hover:bg-brand-primary/90',
        secondary: 'bg-gray-700 text-gray-200 hover:bg-gray-600',
        outline: 'border border-gray-600 bg-transparent text-gray-400 hover:bg-gray-800 hover:text-gray-200',
    };
    return <button className={classNames(baseClasses, variantClasses[variant], className)} {...props}>{children}</button>;
};

const Spinner: FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const UploadArea: FC<{ onFileSelect: (file: File) => void; selectedFile?: File; }> = ({ onFileSelect, selectedFile }) => {
    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };

    return (
        <div className="w-full">
            {selectedFile ? (
                <div className="relative aspect-square w-full rounded-lg overflow-hidden border-2 border-dashed border-gray-600">
                    <img src={URL.createObjectURL(selectedFile)} alt="Garment preview" className="w-full h-full object-cover" />
                    <button onClick={() => onFileSelect(null as any)} className="absolute top-2 right-2 bg-gray-900/50 rounded-full p-1 text-white hover:bg-gray-900">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
            ) : (
                <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full aspect-square rounded-lg border-2 border-dashed border-gray-600 cursor-pointer hover:bg-gray-800 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <PhotoIcon className="w-10 h-10 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-gray-500">JPG, PNG, HEIC</p>
                    </div>
                    <input id="file-upload" type="file" className="hidden" accept="image/jpeg,image/png,image/heic" onChange={handleFileChange} />
                </label>
            )}
        </div>
    );
};

const Header: FC<{ user: User | null, onLogout: () => void, onNavigate: (page: string) => void }> = ({ user, onLogout, onNavigate }) => (
    <header className="bg-gray-800/80 backdrop-blur-sm sticky top-0 z-50">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
                <div className="flex items-center">
                    <a onClick={() => onNavigate('main')} className="flex-shrink-0 text-white font-bold text-lg cursor-pointer flex items-center">
                        <SparklesIcon className="h-6 w-6 text-brand-primary mr-2" />
                        VintedBoost
                    </a>
                </div>
                <div className="flex items-center space-x-4">
                    <Button variant="outline" size="sm" onClick={() => onNavigate('studio')}>Studio</Button>
                    <Button variant="outline" size="sm" onClick={() => onNavigate('settings')}>Settings</Button>
                    {user ? (
                        <Button variant="secondary" size="sm" onClick={onLogout}>Logout</Button>
                    ) : (
                        <Button variant="primary" size="sm" onClick={() => onNavigate('login')}>Login</Button>
                    )}
                </div>
            </div>
        </nav>
    </header>
);

// MAIN PAGE
const MainPage: FC<{ settings: AppSettings, onNavigate: (page: string, listingId?: string) => void, user: User | null }> = ({ settings, onNavigate, user }) => {
    const { getListingsForUser, createListing, addImageToListing } = useMockApi();
    const [garmentFile, setGarmentFile] = useState<File | null>(null);
    const [generationSettings, setGenerationSettings] = useState<GenerationSettings>({
        garmentType: GarmentTypeEnum.Auto,
        gender: settings.defaultGender,
        environment: settings.defaultEnvironment,
        poses: settings.defaultPoses,
        extraInstructions: '',
        modelReferenceType: settings.defaultModelReferenceType,
        flowMode: settings.defaultFlowMode,
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const userListings = useMemo(() => user ? getListingsForUser(user.id) : [], [user, getListingsForUser]);

    const handleGenerate = async () => {
        if (!garmentFile || !user) {
            setError(!user ? "Please login to generate images." : "Please upload a garment photo.");
            return;
        }
        setError(null);
        setIsGenerating(true);

        try {
            const newListing = await createListing(user.id, garmentFile, generationSettings);

            const generationPromises = generationSettings.poses.map(pose => 
                generateOnModelImage(garmentFile, { ...generationSettings, pose })
                    .then(imageUrl => ({
                        id: `img_${Date.now()}_${Math.random()}`,
                        s3_key: `gen/${newListing.id}/${pose}.png`, // Mock S3 key
                        url: imageUrl,
                        pose: pose,
                        prompt: "Prompt details would be stored here.",
                    }))
            );

            const results = await Promise.allSettled(generationPromises);

            results.forEach(result => {
                if (result.status === 'fulfilled') {
                    addImageToListing(newListing.id, result.value);
                } else {
                    console.error("A pose generation failed:", result.reason);
                }
            });
            onNavigate('listing', newListing.id);
        } catch (e: any) {
            setError(e.message || "An unknown error occurred during generation.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="container mx-auto p-4 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Panel: Upload & Options */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <h2 className="text-lg font-semibold mb-4">1. Upload Garment</h2>
                        <UploadArea selectedFile={garmentFile || undefined} onFileSelect={setGarmentFile} />
                    </div>

                    <div className="bg-gray-800 p-4 rounded-lg space-y-4">
                        <h2 className="text-lg font-semibold">2. Customize</h2>
                         <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Garment Type</label>
                            <div className="flex space-x-2">
                                {(Object.values(GarmentTypeEnum)).map(type => (
                                    <Button key={type} variant={generationSettings.garmentType === type ? 'primary' : 'secondary'} onClick={() => setGenerationSettings(s => ({ ...s, garmentType: type }))} className="capitalize flex-1">{type}</Button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Gender</label>
                            <div className="flex space-x-2">
                                <Button variant={generationSettings.gender === GenderEnum.Woman ? 'primary' : 'secondary'} onClick={() => setGenerationSettings(s => ({...s, gender: GenderEnum.Woman}))} className="flex-1">Woman</Button>
                                <Button variant={generationSettings.gender === GenderEnum.Man ? 'primary' : 'secondary'} onClick={() => setGenerationSettings(s => ({...s, gender: GenderEnum.Man}))} className="flex-1">Man</Button>
                            </div>
                        </div>

                         <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Poses (select up to 4)</label>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.values(PoseEnum).map(pose => (
                                     <Button key={pose} variant={generationSettings.poses.includes(pose) ? 'primary' : 'secondary'} onClick={() => {
                                        const currentPoses = generationSettings.poses;
                                        const newPoses = currentPoses.includes(pose) ? currentPoses.filter(p => p !== pose) : [...currentPoses, pose].slice(0, 4);
                                        setGenerationSettings(s => ({...s, poses: newPoses}));
                                     }}>{pose}</Button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="extra" className="block text-sm font-medium text-gray-400 mb-2">Extra Instructions</label>
                            <textarea id="extra" rows={3} value={generationSettings.extraInstructions} onChange={e => setGenerationSettings(s => ({...s, extraInstructions: e.target.value}))} className="w-full bg-gray-700 border-gray-600 rounded-md p-2 text-sm focus:ring-brand-primary focus:border-brand-primary" placeholder="e.g., golden hour lighting"></textarea>
                        </div>
                    </div>
                </div>

                {/* Right Panel: History/Listings */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <h2 className="text-lg font-semibold mb-4">My Listings</h2>
                         {user ? (
                            userListings.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {userListings.map(listing => {
                                        const coverImage = listing.generatedImages.find(img => img.s3_key === listing.coverImageS3Key) || listing.generatedImages[0];
                                        return (
                                            <div key={listing.id} onClick={() => onNavigate('listing', listing.id)} className="cursor-pointer group relative aspect-square bg-gray-700 rounded-lg overflow-hidden">
                                                <img src={coverImage?.url || listing.sourceImage.url} alt="Listing" className="w-full h-full object-cover group-hover:opacity-75 transition-opacity" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                                <p className="absolute bottom-2 left-2 text-xs text-white font-semibold">{new Date(listing.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <p className="text-center text-gray-400 py-8">Your generated listings will appear here.</p>
                            )
                        ) : (
                            <p className="text-center text-gray-400 py-8">Please <a onClick={() => onNavigate('login')} className="text-brand-primary font-semibold cursor-pointer">login</a> to see your listings.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Sticky Generate Button */}
            <div className="sticky bottom-0 left-0 right-0 p-4 bg-gray-900/80 backdrop-blur-sm border-t border-gray-700">
                <div className="container mx-auto flex flex-col items-center">
                    {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
                    <Button
                        variant="primary"
                        className="w-full max-w-md text-lg py-3"
                        onClick={handleGenerate}
                        disabled={isGenerating || !garmentFile}
                    >
                        {isGenerating ? <><Spinner /> Generating...</> : 'Generate'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

// STUDIO PAGE
const StudioPage: FC<{ user: User | null }> = ({ user }) => (
    <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Studio</h1>
        <div className="bg-gray-800 p-6 rounded-lg">
             <p className="text-gray-400">The Studio is a place to manage your personal defaults for environments, models, and poses.</p>
             <p className="text-gray-400 mt-2">This feature is under construction. In the full app, you would be able to:</p>
             <ul className="list-disc list-inside text-gray-400 mt-4 space-y-2">
                <li>Upload and manage source images for environments and models.</li>
                <li>Generate variations and set your favorites as defaults.</li>
                {user?.isAdmin && <li>(Admin) Manage global pose descriptions.</li>}
             </ul>
        </div>
    </div>
);

// SETTINGS PAGE
const SettingsPage: FC<{ settings: AppSettings, onSave: (settings: AppSettings) => void }> = ({ settings: initialSettings, onSave }) => {
    const [settings, setSettings] = useState(initialSettings);

    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <h1 className="text-3xl font-bold mb-6">Settings</h1>
            <div className="bg-gray-800 p-6 rounded-lg space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Default Gender</label>
                    <select value={settings.defaultGender} onChange={e => setSettings(s => ({...s, defaultGender: e.target.value as Gender}))} className="w-full bg-gray-700 border-gray-600 rounded-md p-2">
                        <option value={GenderEnum.Woman}>Woman</option>
                        <option value={GenderEnum.Man}>Man</option>
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Default Environment</label>
                    <p className="text-xs text-gray-500 mb-2">In full version, this would be a dropdown of your Studio defaults.</p>
                     <select value={settings.defaultEnvironment} onChange={e => setSettings(s => ({...s, defaultEnvironment: e.target.value as Environment}))} className="w-full bg-gray-700 border-gray-600 rounded-md p-2">
                        {Object.values(EnvironmentEnum).map(env => <option key={env} value={env} className="capitalize">{env}</option>)}
                    </select>
                </div>

                <Button onClick={() => onSave(settings)}>Save Settings</Button>
            </div>
        </div>
    );
};

// LISTING DETAIL PAGE
const ListingDetailPage: FC<{ listingId: string | null, user: User | null, onNavigate: (page: string) => void }> = ({ listingId, user, onNavigate }) => {
    const { getListingById } = useMockApi();
    const listing = useMemo(() => listingId ? getListingById(listingId) : null, [listingId, getListingById]);
    const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);

    useEffect(() => {
        if(listing?.generatedImages?.length) {
            setSelectedImage(listing.generatedImages[0]);
        }
    }, [listing]);

    if (!listing || (user && listing.userId !== user.id)) {
        return <div className="container mx-auto p-4 text-center">Listing not found or you don't have access.</div>;
    }

    return (
        <div className="container mx-auto p-4">
            <Button variant="outline" onClick={() => onNavigate('main')} className="mb-4">{'< Back to Main'}</Button>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className="bg-gray-800 rounded-lg p-2">
                        <div className="aspect-square bg-gray-900 rounded-md flex items-center justify-center">
                           {selectedImage ? <img src={selectedImage.url} alt={`Generated image for pose: ${selectedImage.pose}`} className="max-w-full max-h-full object-contain" /> : <p>No image selected</p>}
                        </div>
                    </div>
                     <div className="flex space-x-2 overflow-x-auto mt-4 pb-2">
                        {listing.generatedImages.map(img => (
                            <div key={img.id} onClick={() => setSelectedImage(img)} className={classNames("flex-shrink-0 w-24 h-24 bg-gray-700 rounded-md cursor-pointer overflow-hidden ring-2", selectedImage?.id === img.id ? 'ring-brand-primary' : 'ring-transparent')}>
                                <img src={img.url} className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="bg-gray-800 rounded-lg p-4">
                        <h2 className="font-semibold mb-2">Source Garment</h2>
                        <img src={listing.sourceImage.url} alt={listing.sourceImage.name} className="w-full rounded-md" />
                    </div>
                     <div className="bg-gray-800 rounded-lg p-4">
                        <h2 className="font-semibold mb-2">Generation Details</h2>
                        <div className="text-sm space-y-1 text-gray-400">
                            <p><strong className="text-gray-200">Pose:</strong> {selectedImage?.pose}</p>
                             <p><strong className="text-gray-200">Gender:</strong> <span className="capitalize">{listing.settings.gender}</span></p>
                             <p><strong className="text-gray-200">Environment:</strong> <span className="capitalize">{listing.settings.environment}</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// LOGIN PAGE
const LoginPage: FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    return (
        <div className="container mx-auto p-4 max-w-sm text-center">
            <div className="bg-gray-800 p-8 rounded-lg mt-16">
                <h1 className="text-2xl font-bold mb-6">Login</h1>
                <p className="text-gray-400 mb-4">This is a mock login. Enter any email. To be an admin, use "admin@vintedboost.com".</p>
                <input 
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-gray-700 border-gray-600 rounded-md p-2 mb-4"
                    placeholder="your@email.com"
                />
                <Button className="w-full" onClick={() => {
                    const isAdmin = email.toLowerCase() === 'admin@vintedboost.com';
                    onLogin({ id: `user_${Date.now()}`, email, isAdmin });
                }}>Login</Button>
            </div>
        </div>
    );
};

// App - Main Component
const App: FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [page, setPage] = useState<{ name: string, id?: string }>({ name: 'main' });
    const [settings, setSettings] = useState<AppSettings>({
        defaultGender: GenderEnum.Woman,
        defaultEnvironment: EnvironmentEnum.Studio,
        defaultPoses: [PoseEnum.Face, PoseEnum.ThreeQuarter],
        defaultFlowMode: 'classic',
        defaultModelReferenceType: 'image',
    });

    // Auth & Settings Persistence
    useEffect(() => {
        const storedUser = localStorage.getItem('vintedboost_user');
        const storedSettings = localStorage.getItem('vintedboost_settings');
        if (storedUser) setUser(JSON.parse(storedUser));
        if (storedSettings) setSettings(JSON.parse(storedSettings));
    }, []);

    const handleLogin = (newUser: User) => {
        setUser(newUser);
        localStorage.setItem('vintedboost_user', JSON.stringify(newUser));
        setPage({ name: 'main' });
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('vintedboost_user');
        setPage({ name: 'main' });
    };

    const handleSaveSettings = (newSettings: AppSettings) => {
        setSettings(newSettings);
        localStorage.setItem('vintedboost_settings', JSON.stringify(newSettings));
        alert("Settings saved!");
        setPage({ name: 'main' });
    };

    const handleNavigate = (pageName: string, id?: string) => {
        // Protected routes check
        const protectedRoutes = ['main', 'settings', 'listing'];
        if (protectedRoutes.includes(pageName) && !user) {
            setPage({ name: 'login' });
            return;
        }
        setPage({ name: pageName, id });
        window.scrollTo(0, 0);
    };

    const renderPage = () => {
        switch (page.name) {
            case 'login': return <LoginPage onLogin={handleLogin} />;
            case 'studio': return <StudioPage user={user} />;
            case 'settings': return <SettingsPage settings={settings} onSave={handleSaveSettings} />;
            case 'listing': return <ListingDetailPage listingId={page.id || null} user={user} onNavigate={handleNavigate} />;
            case 'main':
            default:
                return <MainPage settings={settings} onNavigate={handleNavigate} user={user} />;
        }
    };
    
    // Auto-navigate to login if user is not logged in on a protected page
    useEffect(() => {
        const protectedRoutes = ['main', 'settings', 'listing'];
        if (protectedRoutes.includes(page.name) && !user) {
            setPage({ name: 'login' });
        }
    }, [page.name, user]);

    return (
        <div className="min-h-screen bg-gray-900 font-sans">
            <Header user={user} onLogout={handleLogout} onNavigate={handleNavigate} />
            <main>
                {renderPage()}
            </main>
        </div>
    );
};

export default App;
