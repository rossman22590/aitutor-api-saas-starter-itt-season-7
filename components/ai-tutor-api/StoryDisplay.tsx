// src/components/ai-tutor-api/StoryDisplay.tsx
"use client";
import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

interface AdOption {
  Option: number;
  Link: string;
  Title: string;
  description: string;
  Keywords: string[];
  "Keywords to target": string[];
  Score: number;
  Rationale: string;
}

interface StoryDisplayProps {
  result: {
    result?: string;
    success?: boolean;
    company?: string;
  };
}

export default function StoryDisplay({ result }: StoryDisplayProps) {
  const [adOptions, setAdOptions] = useState<AdOption[]>([]);
  const [companyName, setCompanyName] = useState<string>('');

  useEffect(() => {
    if (result) {
      // Set company name if it exists in the result
      if (result.company) {
        setCompanyName(result.company);
      }

      // Parse the result data
      if (result.result) {
        try {
          let jsonString = result.result;
          
          // Check if the result is wrapped in a markdown code block
          if (typeof jsonString === 'string') {
            // Extract JSON from markdown code block if present
            const codeBlockMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
            if (codeBlockMatch && codeBlockMatch[1]) {
              jsonString = codeBlockMatch[1];
            }
            
            // Parse the JSON string
            const parsedResult = JSON.parse(jsonString);
            
            if (Array.isArray(parsedResult)) {
              setAdOptions(parsedResult);
            }
          } else if (typeof result.result === 'object') {
            // If result.result is already an object (not a string)
            if (Array.isArray(result.result)) {
              setAdOptions(result.result);
            }
          }
        } catch (error) {
          console.error('Error parsing result:', error);
        }
      }
    }
  }, [result]);

  // Function to extract domain from URL
  const extractDomain = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return domain;
    } catch (e) {
      return url;
    }
  };

  // Data for the pie chart
  const createPieData = (score: number) => {
    return [
      { name: 'Score', value: score },
      { name: 'Remaining', value: 10 - score }
    ];
  };

  const COLORS = ['#4f46e5', '#e5e7eb'];

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-center mb-6">Generated Ad Options</h2>
      
      {adOptions.map((option) => (
        <Card key={option.Option} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Google Search Result Preview - 5 columns */}
              <div className="lg:col-span-5 space-y-2">
                <div className="flex items-center text-sm text-gray-500 mb-1">
                  <span className="font-medium">Ad</span>
                  <span className="mx-2">·</span>
                  <span>{extractDomain(option.Link)}</span>
                </div>
                
                {/* Company name at the top */}
                <div className="text-sm font-medium text-gray-700 mb-1">
                  {companyName}
                </div>
                
                <div className="text-sm text-gray-500">{option.Link}</div>
                
                <a href={option.Link} target="_blank" rel="noopener noreferrer" 
                   className="text-xl font-medium text-blue-600 hover:underline flex items-center">
                  {option.Title}
                  <ExternalLink className="ml-1 h-4 w-4" />
                </a>
                
                <p className="text-sm text-gray-700 line-clamp-2">
                  {option.description}
                </p>
              </div>
              
              {/* Score Pie Chart - 2 columns */}
              <div className="lg:col-span-2 flex justify-center items-center">
                <div className="w-24 h-24 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={createPieData(option.Score)}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={40}
                        fill="#8884d8"
                        paddingAngle={2}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                      >
                        {createPieData(option.Score).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold">{option.Score}</span>
                  </div>
                </div>
              </div>
              
              {/* Keywords - 2 columns */}
              <div className="lg:col-span-2">
                <h4 className="font-medium text-gray-700 mb-2">Keywords to Target</h4>
                <div className="flex flex-wrap gap-2">
                  {(option["Keywords to target"] || option.Keywords || []).map((keyword, i) => (
                    <Badge key={i} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
              
              {/* Rationale - 3 columns */}
              <div className="lg:col-span-3">
                <h4 className="font-medium text-gray-700 mb-2">Rationale</h4>
                <p className="text-sm text-gray-600">{option.Rationale}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {adOptions.length === 0 && result && result.result && (
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600">
              Unable to display the result in the expected format. Please check the input and try again.
            </p>
            <pre className="mt-4 p-4 bg-gray-100 rounded-md overflow-auto text-xs">
              {typeof result.result === 'string' ? result.result : JSON.stringify(result.result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
