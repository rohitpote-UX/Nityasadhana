import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Compass, Home } from "lucide-react";

export const dynamic = "force-static";

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Container size="form">
        <Card className="space-y-5 p-6 text-center shadow-level2 sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#D8F1EE]/60 text-[#3F9495]">
            <Compass className="h-7 w-7 stroke-[1.75]" />
          </div>

          <div className="space-y-1.5">
            <p className="font-serif text-[13px] font-medium text-[#A9824D]">मार्गभ्रंशः • ४०४</p>
            <h2 className="text-[22px] font-bold tracking-tight text-[#193B3B]">
              Looks like this path has wandered
            </h2>
            <p className="mx-auto max-w-sm text-[14px] text-[#547070]">
              The page or resource you are looking for does not exist or has been moved.
            </p>
          </div>

          <div className="flex justify-center pt-2">
            <Link href="/">
              <Button
                variant="primary"
                leftIcon={<Home className="h-4 w-4" />}
                className="min-w-[160px]"
              >
                Return Home
              </Button>
            </Link>
          </div>
        </Card>
      </Container>
    </div>
  );
}
