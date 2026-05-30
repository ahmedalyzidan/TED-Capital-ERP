const axios = require('axios');

/**
 * Service to handle integration with the E-Invoicing Tax Portal (e.g., ETA Portal)
 */
class EInvoicingService {
    constructor() {
        // Sandbox environment URL by default
        this.portalBaseUrl = process.env.ETA_PORTAL_URL || 'https://api.preprod.invoicing.eta.gov.eg';
        this.clientId = process.env.ETA_CLIENT_ID || 'mock-client-id';
        this.clientSecret = process.env.ETA_CLIENT_SECRET || 'mock-client-secret';
    }

    /**
     * Authenticate and get Access Token from Tax Authority Identity Server
     */
    async getAccessToken() {
        // In simulation/sandbox mode, return a dummy token
        if (this.clientId === 'mock-client-id') {
            return 'mock-access-token-xyz123';
        }
        
        try {
            const authUrl = `${this.portalBaseUrl}/connect/token`;
            const params = new URLSearchParams();
            params.append('grant_type', 'client_credentials');
            params.append('client_id', this.clientId);
            params.append('client_secret', this.clientSecret);

            const response = await axios.post(authUrl, params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            return response.data.access_token;
        } catch (error) {
            console.error('[E-INVOICE AUTH ERROR]', error.response?.data || error.message);
            throw new Error('Failed to authenticate with E-Invoicing Tax Portal.');
        }
    }

    /**
     * Serialize invoice into the format required by the portal (ETA JSON format)
     */
    serializeInvoice(invoice, items, customer, companySettings = {}) {
        return {
            issuer: {
                address: {
                    branchID: companySettings.branchId || '0',
                    country: companySettings.country || 'EG',
                    governate: companySettings.governate || 'Cairo',
                    city: companySettings.city || 'Cairo',
                    buildingNumber: companySettings.buildingNo || '1',
                    street: companySettings.street || 'Main St',
                },
                type: 'B', // Business
                id: companySettings.taxRegistrationNumber || '123456789', // Tax Registration No
                name: companySettings.companyName || 'TED Capital'
            },
            receiver: {
                address: {
                    country: customer.country || 'EG',
                    governate: customer.governate || 'Cairo',
                    city: customer.city || 'Cairo',
                    buildingNumber: customer.building_no || '10',
                    street: customer.street || 'Customer St',
                },
                type: customer.type || 'B', // B = Business, P = Person
                id: customer.tax_id || customer.national_id || '987654321', // Tax ID / National ID
                name: customer.name
            },
            documentType: 'I', // Invoice
            documentTypeVersion: '1.0', // Standard v1.0
            dateTimeIssued: new Date(invoice.issue_date).toISOString(),
            taxpayerActivityCode: companySettings.activityCode || '4610',
            internalID: invoice.invoice_no,
            invoiceLines: items.map((item, index) => {
                const lineValue = Number(item.quantity) * Number(item.unit_price);
                return {
                    description: item.description,
                    itemType: 'EGS',
                    itemCode: item.item_code || `EG-123456789-${item.id || index}`,
                    unitType: 'EA',
                    quantity: Number(item.quantity),
                    internalCode: item.id?.toString() || index.toString(),
                    salesTotal: lineValue,
                    totalTaxableFees: 0,
                    discount: {
                        rate: 0,
                        amount: 0
                    },
                    netValue: lineValue,
                    taxableItems: [
                        {
                            taxType: 'T1', // VAT
                            amount: lineValue * 0.14, // 14% Standard VAT
                            rate: 14,
                            subType: 'V009'
                        }
                    ],
                    total: lineValue + (lineValue * 0.14),
                    valueDifference: 0
                };
            }),
            totalDiscountAmount: 0,
            totalSalesAmount: Number(invoice.subtotal),
            netAmount: Number(invoice.subtotal),
            taxTotals: [
                {
                    taxType: 'T1',
                    amount: Number(invoice.tax_amount || 0)
                }
            ],
            totalAmount: Number(invoice.total_amount),
            extraFees: 0,
            backofficeArea: {}
        };
    }

    /**
     * Sign document digitally with HSM/USB token representation (Canonical string signing)
     */
    signDocument(document) {
        // Placeholder for canonical serialization and cryptographic signing (SHA256withRSA)
        // In simulation/sandbox mode, wrap in document structure with a dummy signature
        return {
            documents: [
                {
                    ...document,
                    signatures: [
                        {
                            signatureType: 'I',
                            value: 'MIIEvgYJKoZIhvcNAQcCoIIEsDCCEqwCAQExCzAJBgUrDgMCGgUAMAsGCSqGSIb3DQEHAaCC...' // Mocked certificate signature
                        }
                    ]
                }
            ]
        };
    }

    /**
     * Submit signed document payload to Portal API
     */
    async submitSignedDocument(signedPayload, token) {
        if (this.clientId === 'mock-client-id') {
            // Mock Portal Success Response
            return {
                submissionId: 'sub-uuid-abc-123456',
                acceptedDocuments: [
                    {
                        uuid: 'invoice-portal-uuid-999888',
                        internalId: signedPayload.documents[0].internalID
                    }
                ],
                rejectedDocuments: []
            };
        }

        try {
            const submitUrl = `${this.portalBaseUrl}/api/v1.0/documentsubmissions`;
            const response = await axios.post(submitUrl, signedPayload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('[E-INVOICE SUBMIT ERROR]', error.response?.data || error.message);
            throw new Error(JSON.stringify(error.response?.data?.errors || 'Tax portal submission rejected.'));
        }
    }
}

module.exports = new EInvoicingService();
