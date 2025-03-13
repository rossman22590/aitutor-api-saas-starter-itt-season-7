// app/(dashboard)/dashboard/adgen/page.tsx
"use client";
import { useState } from 'react';
import StoryDisplay from '@/components/ai-tutor-api/StoryDisplay';
import Link from 'next/link';
import { WorkflowHistoryDrawer } from '@/components/workflow/WorkflowHistoryDrawer';

export default function Workflow() {
    const [website, setWebsite] = useState('');
    const [company, setCompany] = useState('');
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!website.trim()) {
            setError('Please enter a website URL or content');
            return;
        }
        if (!company.trim()) {
            setError('Please enter a company name');
            return;
        }
        setError('');
        setLoading(true);
        setResult(null);

        try {
            const response = await fetch('/api/run', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    website: website,
                    company: company
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Add company name to the result for display
                setResult({
                    ...data,
                    company: company
                });
                setError('');
            } else {
                setError(data.error || 'An error occurred while fetching the content.');
            }
        } catch (err) {
            setError('An error occurred while fetching the content.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectHistory = (input: string, output: string) => {
        try {
            // Parse the input which should be a JSON string
            const inputData = JSON.parse(input);
            if (inputData.website) setWebsite(inputData.website);
            if (inputData.company) setCompany(inputData.company);
            
            // Parse the output
            let outputData;
            try {
                outputData = JSON.parse(output);
            } catch (e) {
                // If output is not valid JSON, use it as is
                outputData = { result: output };
            }
            
            // Add company name to the result for display
            setResult({
                ...outputData,
                company: inputData.company
            });
        } catch (err) {
            console.error('Error parsing history data:', err);
            // If parsing fails, try to set the raw values
            setWebsite(input);
            setResult({ result: output });
        }
    };

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-8 p-4 md:p-8">
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text inline-block" 
                        style={{ lineHeight: '1.5', padding: '0.5em 0' }}>
                        Google Ad Generator
                    </h1>
                    <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
                        Enter your website content or URL and company name to generate optimized Google ad options
                    </p>
                </div>

                <div className="glass-morphism p-6 md:p-8 mb-8 rounded-xl shadow-xl backdrop-blur-lg bg-white/30">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label htmlFor="website" className="block text-lg font-medium text-gray-700">
                                    Website:
                                </label>
                                <WorkflowHistoryDrawer onSelectHistory={handleSelectHistory} />
                            </div>
                            <input
                                id="website"
                                type="text"
                                value={website}
                                onChange={(e) => setWebsite(e.target.value)}
                                placeholder="Enter your website URL or content"
                                className="w-full p-4 rounded-lg bg-white/50 border border-purple-200 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent shadow-inner"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <label htmlFor="company" className="block text-lg font-medium text-gray-700">
                                Company Name:
                            </label>
                            <input
                                id="company"
                                type="text"
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                placeholder="Enter your company name"
                                className="w-full p-4 rounded-lg bg-white/50 border border-purple-200 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent shadow-inner"
                            />
                        </div>
                        
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 px-6 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Generating Ads...
                                </span>
                            ) : (
                                'Generate Google Ads'
                            )}
                        </button>
                    </form>
                </div>

                {error && (
                    <div className="glass-morphism p-4 mb-8 text-red-600 text-center rounded-lg bg-red-50/50">
                        {error}
                    </div>
                )}

                {result && <StoryDisplay result={result} />}
            </div>
        </div>
    );
}
