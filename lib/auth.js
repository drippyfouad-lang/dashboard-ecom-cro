import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from './mongodb';
import User from './models/User';
import Activity from './models/Activity';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter email and password');
        }

        await connectDB();

        const user = await User.findOne({ email: credentials.email.toLowerCase() });

        if (!user) {
          throw new Error('Invalid email or password');
        }

        if (!user.active) {
          throw new Error('Your account has been deactivated');
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error('Invalid email or password');
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.full_name,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      try {
        await connectDB();
        await Activity.create({
          user_id: user.id,
          user_email: user.email?.toLowerCase() || '',
          user_name: user.name || '',
          action_type: 'login',
          resource: 'user',
          resource_id: user.id || null,
          entity_name: user.name || user.email || 'Unknown user',
          details: {
            message: 'User logged in',
          },
        });
      } catch (error) {
        console.error('Failed to log login activity:', error);
      }
    },
    async signOut({ token, session }) {
      try {
        await connectDB();
        const identifier = token?.id || session?.user?.id || null;
        const email = token?.email || session?.user?.email || '';
        const name = session?.user?.name || token?.name || '';

        await Activity.create({
          user_id: identifier,
          user_email: email?.toLowerCase() || '',
          user_name: name || '',
          action_type: 'logout',
          resource: 'user',
          resource_id: identifier,
          entity_name: name || email || 'Unknown user',
          details: {
            message: 'User logged out',
          },
        });
      } catch (error) {
        console.error('Failed to log logout activity:', error);
      }
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
