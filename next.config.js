/** @type {import('next').NextConfig} */

// The FinancialSuite API has no CORS policy, so the browser calls /api/* on this
// origin and Next.js forwards the request to the backend.
const apiUrl = process.env.API_URL || 'https://localhost:7265';

const nextConfig = {
    poweredByHeader: false,
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${apiUrl}/api/:path*`
            }
        ];
    },
    sassOptions: {
        includePaths: ['./styles']
    }
};

module.exports = nextConfig;
