import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <p className="text-sm text-muted-foreground">
            Built by Dima Bondar. Powered by NextJS, AWS Amplify, AppSync and
            DynamoDB.
          </p>
          <div className="pt-8 border-t">
            <p className="text-sm text-muted-foreground">
              © 2025 quickpoll.live | all rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
