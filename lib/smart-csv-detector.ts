/**
 * Smart CSV Column Detection and Auto-Mapping
 * 
 * This utility provides intelligent column detection and mapping for CSV imports
 * without requiring manual mapping every time.
 */

export interface ColumnDetection {
  originalName: string;
  detectedType: 'name' | 'email' | 'phone' | 'company' | 'address' | 'website' | 'category' | 'region' | 'employees' | 'growth' | 'text';
  confidence: number; // 0-1
  suggestedMapping: string;
  isPhone: boolean;
  sampleValues: string[];
}

export interface SmartMappingResult {
  columns: ColumnDetection[];
  autoMappings: Record<string, string>;
  phoneColumns: string[];
  recommendedColumns: string[];
  skippedColumns: string[];
}

/**
 * Smart column detection patterns
 */
const DETECTION_PATTERNS = {
  name: {
    patterns: [
      /^(name|full.?name|nom|prénom|prenom)$/i,
      /^(first.?name|prénom|prenom)$/i,
      /^(last.?name|nom.?famille|surname)$/i,
      /^(company.?name|entreprise|société|societe)$/i,
      /^(business.?name|raison.?sociale)$/i
    ],
    confidence: 0.9
  },
  email: {
    patterns: [
      /^(email|e.?mail|courriel|adresse.?email)$/i,
      /^(contact.?email|email.?contact)$/i
    ],
    confidence: 0.95
  },
  phone: {
    patterns: [
      /^(phone|téléphone|telephone|tel|mobile|portable|gsm)$/i,
      /^(contact.?phone|phone.?number|numéro|numero)$/i,
      /^(work.?phone|phone.?work|tél\.?travail)$/i
    ],
    confidence: 0.9
  },
  company: {
    patterns: [
      /^(company|entreprise|société|societe|business|firm)$/i,
      /^(organization|organisation|org)$/i,
      /^(corporation|corp)$/i
    ],
    confidence: 0.85
  },
  address: {
    patterns: [
      /^(address|adresse|lieu|location)$/i,
      /^(street|rue|avenue|boulevard)$/i,
      /^(city|ville|municipality)$/i,
      /^(postal.?code|code.?postal|zip)$/i
    ],
    confidence: 0.8
  },
  website: {
    patterns: [
      /^(website|site|web|url|domaine)$/i,
      /^(homepage|page.?d'accueil)$/i,
      /^(www|http|https)$/i
    ],
    confidence: 0.85
  },
  category: {
    patterns: [
      /^(category|catégorie|categorie|type|secteur|industry)$/i,
      /^(business.?type|type.?activité|activity)$/i,
      /^(domain|domaine|field|champ)$/i
    ],
    confidence: 0.8
  },
  region: {
    patterns: [
      /^(region|région|area|zone|territory)$/i,
      /^(location|lieu|place|emplacement)$/i,
      /^(country|pays|nation)$/i,
      /^(state|état|province|département)$/i
    ],
    confidence: 0.8
  },
  employees: {
    patterns: [
      /^(employees|employés|employes|staff|personnel)$/i,
      /^(size|taille|effectif)$/i,
      /^(workforce|main.?d'œuvre|main.?oeuvre)$/i,
      /^(headcount|nombre.?employés)$/i
    ],
    confidence: 0.85
  },
  growth: {
    patterns: [
      /^(growth|croissance|evolution|évolution)$/i,
      /^(increase|augmentation|progression)$/i,
      /^(rate|taux|pourcentage)$/i,
      /^(change|changement|variation)$/i
    ],
    confidence: 0.8
  }
};

/**
 * Phone number detection patterns
 */
const PHONE_PATTERNS = [
  /^(\+33|0)[1-9](?:[0-9]{8})$/,
  /^(\+33|0)[1-9](?:[0-9\s]{8,})$/,
  /^(\+33|0)[1-9](?:[0-9\.\-]{8,})$/,
  /^(\+33|0)[1-9](?:[0-9]{2}\s[0-9]{2}\s[0-9]{2}\s[0-9]{2})$/
];

/**
 * Email detection pattern
 */
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Website detection pattern
 */
const WEBSITE_PATTERN = /^https?:\/\/[^\s]+/;

/**
 * Detect column type based on header name and sample values
 */
export function detectColumnType(header: string, sampleValues: string[]): ColumnDetection {
  const lowerHeader = header.toLowerCase().trim();
  
  // Check against detection patterns
  for (const [type, config] of Object.entries(DETECTION_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(lowerHeader)) {
        const confidence = config.confidence;
        const isPhone = type === 'phone';
        
        return {
          originalName: header,
          detectedType: type as any,
          confidence,
          suggestedMapping: getSuggestedMapping(type as any),
          isPhone,
          sampleValues: sampleValues.slice(0, 3)
        };
      }
    }
  }
  
  // If no pattern matches, analyze sample values
  const valueBasedDetection = analyzeSampleValues(sampleValues);
  if (valueBasedDetection.confidence > 0.7) {
    return {
      originalName: header,
      detectedType: valueBasedDetection.type as any,
      confidence: valueBasedDetection.confidence,
      suggestedMapping: getSuggestedMapping(valueBasedDetection.type),
      isPhone: valueBasedDetection.type === 'phone',
      sampleValues: sampleValues.slice(0, 3)
    };
  }
  
  // Default to text
  return {
    originalName: header,
    detectedType: 'text',
    confidence: 0.5,
    suggestedMapping: 'text',
    isPhone: false,
    sampleValues: sampleValues.slice(0, 3)
  };
}

/**
 * Analyze sample values to detect column type
 */
function analyzeSampleValues(values: string[]): { type: string; confidence: number } {
  if (values.length === 0) {
    return { type: 'text' as const, confidence: 0.5 };
  }
  
  const nonEmptyValues = values.filter(v => v && v.trim().length > 0);
  if (nonEmptyValues.length === 0) {
    return { type: 'text' as const, confidence: 0.5 };
  }
  
  // Check for phone numbers
  const phoneMatches = nonEmptyValues.filter(v => 
    PHONE_PATTERNS.some(pattern => pattern.test(v.replace(/\s/g, '')))
  );
  if (phoneMatches.length / nonEmptyValues.length > 0.7) {
    return { type: 'phone', confidence: 0.9 };
  }
  
  // Check for emails
  const emailMatches = nonEmptyValues.filter(v => EMAIL_PATTERN.test(v));
  if (emailMatches.length / nonEmptyValues.length > 0.7) {
    return { type: 'email', confidence: 0.95 };
  }
  
  // Check for websites
  const websiteMatches = nonEmptyValues.filter(v => WEBSITE_PATTERN.test(v));
  if (websiteMatches.length / nonEmptyValues.length > 0.7) {
    return { type: 'website', confidence: 0.9 };
  }
  
  // Check for numbers (employees, growth, etc.)
  const numberMatches = nonEmptyValues.filter(v => 
    /^\d+(\.\d+)?%?$/.test(v.replace(/\s/g, ''))
  );
  if (numberMatches.length / nonEmptyValues.length > 0.7) {
    // Check if it looks like growth percentage
    const growthMatches = nonEmptyValues.filter(v => v.includes('%'));
    if (growthMatches.length > 0) {
      return { type: 'growth', confidence: 0.8 };
    }
    // Check if it looks like employee count
    const employeeMatches = nonEmptyValues.filter(v => {
      const num = parseInt(v.replace(/\D/g, ''));
      return num > 0 && num < 1000000; // Reasonable employee count range
    });
    if (employeeMatches.length / nonEmptyValues.length > 0.7) {
      return { type: 'employees', confidence: 0.8 };
    }
    return { type: 'text', confidence: 0.6 };
  }
  
  // Check for company names (usually contain business-related words)
  const companyWords = ['ltd', 'llc', 'inc', 'corp', 'sarl', 'sas', 'sa', 'gmbh', 'solutions', 'services', 'group', 'company'];
  const companyMatches = nonEmptyValues.filter(v => 
    companyWords.some(word => v.toLowerCase().includes(word))
  );
  if (companyMatches.length / nonEmptyValues.length > 0.3) {
    return { type: 'company', confidence: 0.7 };
  }
  
  return { type: 'text', confidence: 0.5 };
}

/**
 * Get suggested mapping for detected type
 */
function getSuggestedMapping(type: string): string {
  const mappingMap: Record<string, string> = {
    'name': 'name',
    'email': 'email',
    'phone': 'phone',
    'company': 'company',
    'address': 'address',
    'website': 'website',
    'category': 'category',
    'region': 'region',
    'employees': 'employees',
    'growth': 'growth',
    'text': 'text'
  };
  
  return mappingMap[type] || 'text';
}

/**
 * Smart CSV mapping - automatically detect and map columns
 */
export function smartCSVMapping(headers: string[], data: string[][]): SmartMappingResult {
  const columns: ColumnDetection[] = [];
  const autoMappings: Record<string, string> = {};
  const phoneColumns: string[] = [];
  const recommendedColumns: string[] = [];
  const skippedColumns: string[] = [];
  
  // Analyze each column
  headers.forEach((header, index) => {
    const sampleValues = data.slice(0, 10).map(row => row[index] || '').filter(v => v.trim());
    const detection = detectColumnType(header, sampleValues);
    
    columns.push(detection);
    
    // Auto-map high confidence columns
    if (detection.confidence > 0.7) {
      autoMappings[header] = detection.suggestedMapping;
      recommendedColumns.push(header);
      
      if (detection.isPhone) {
        phoneColumns.push(header);
      }
    } else {
      // Low confidence columns - let user decide
      autoMappings[header] = 'text';
      skippedColumns.push(header);
    }
  });
  
  return {
    columns,
    autoMappings,
    phoneColumns,
    recommendedColumns,
    skippedColumns
  };
}

/**
 * Parse CSV content into rows
 */
export function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  const lines = csvText.split('\n');
  
  for (const line of lines) {
    if (line.trim()) {
      const row = parseCSVLine(line);
      if (row.length > 0) {
        rows.push(row);
      }
    }
  }
  
  return rows;
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  
  return result;
}

/**
 * Validate CSV data
 */
export function validateCSVData(headers: string[], data: string[][]): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check headers
  if (headers.length === 0) {
    errors.push('Le fichier CSV doit contenir des en-têtes');
  }
  
  // Check for duplicate headers
  const duplicateHeaders = headers.filter((header, index) => 
    headers.indexOf(header) !== index
  );
  if (duplicateHeaders.length > 0) {
    errors.push(`En-têtes dupliqués détectés: ${duplicateHeaders.join(', ')}`);
  }
  
  // Check data consistency
  if (data.length === 0) {
    errors.push('Le fichier CSV doit contenir au moins une ligne de données');
  }
  
  // Check row length consistency
  const inconsistentRows = data.filter(row => row.length !== headers.length);
  if (inconsistentRows.length > 0) {
    warnings.push(`${inconsistentRows.length} lignes ont un nombre de colonnes incohérent`);
  }
  
  // Check for empty rows
  const emptyRows = data.filter(row => row.every(cell => !cell || cell.trim() === ''));
  if (emptyRows.length > 0) {
    warnings.push(`${emptyRows.length} lignes vides détectées`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
