#import <XCTest/XCTest.h>
#import "ApplePushProvisioning.h"
#import <PassKit/PassKit.h>
#import <React/RCTBridge.h>
#import <React/RCTEventDispatcher.h>
#import <OCMock/OCMock.h>

@interface ApplePushProvisioningTests : XCTestCase
@property (nonatomic, strong) ApplePushProvisioning *module;
@property (nonatomic, strong) RCTBridge *bridge;
@property (nonatomic, strong) id mockModule;
@end

@implementation ApplePushProvisioningTests

- (void)setUp {
    [super setUp];
    self.bridge = [[RCTBridge alloc] initWithBundleURL:nil moduleProvider:nil launchOptions:nil];
    self.mockModule = OCMPartialMock([[ApplePushProvisioning alloc] initWithBridge:self.bridge]);
    self.module = self.mockModule;
}

- (void)tearDown {
    self.module = nil;
    self.bridge = nil;
    [self.mockModule stopMocking];
    self.mockModule = nil;
    [super tearDown];
}

- (void)testCanAddPaymentPass {
    XCTestExpectation *expectation = [self expectationWithDescription:@"Testing canAddPaymentPass"];
    [self.module canAddPaymentPass:^(id result) {
        XCTAssertNotNil(result);
        XCTAssertTrue([result boolValue]);
        [expectation fulfill];
    } rejector:^(NSString *code, NSString *message, NSError *error) {
        XCTFail(@"Error: %@", message);
        [expectation fulfill];
    }];
    [self waitForExpectationsWithTimeout:5 handler:nil];
}

- (void)testStartAddPaymentPass {
    XCTestExpectation *expectation = [self expectationWithDescription:@"Testing startAddPaymentPass"];
    [self.module startAddPaymentPass:@"1234" cardHolderName:@"John Doe" resolver:^(id result) {
        XCTAssertNil(result);
        [expectation fulfill];
    } rejector:^(NSString *code, NSString *message, NSError *error) {
        XCTFail(@"Error: %@", message);
        [expectation fulfill];
    }];
    [self waitForExpectationsWithTimeout:5 handler:nil];
}

- (void)testStartAddPaymentPassFailure {
    OCMStub([self.mockModule canAddPaymentPass]).andReturn(@NO);

    XCTestExpectation *expectation = [self expectationWithDescription:@"Testing startAddPaymentPass failure"];
    [self.mockModule startAddPaymentPass:@"1234" cardHolderName:@"John Doe" resolver:^(id result) {
        XCTFail(@"Expected failure, but succeeded.");
        [expectation fulfill];
    } rejector:^(NSString *code, NSString *message, NSError *error) {
        XCTAssertEqualObjects(code, @"payment_pass_unsupported");
        [expectation fulfill];
    }];
    [self waitForExpectationsWithTimeout:5 handler:nil];
}

- (void)testCompleteAddPaymentPass {
    XCTestExpectation *expectation = [self expectationWithDescription:@"Testing completeAddPaymentPass"];

    // Create a mock completion handler
    void (^mockCompletionHandler)(PKAddPaymentPassRequest *request) = ^(PKAddPaymentPassRequest *request) {
        XCTAssertNotNil(request);
        XCTAssertEqualObjects([[NSString alloc] initWithData:request.activationData encoding:NSUTF8StringEncoding], @"activationData");
        XCTAssertEqualObjects([[NSString alloc] initWithData:request.encryptedPassData encoding:NSUTF8StringEncoding], @"encryptedData");
        XCTAssertEqualObjects([[NSString alloc] initWithData:request.ephemeralPublicKey encoding:NSUTF8StringEncoding], @"ephemeralKey");
        [expectation fulfill];
    };

    // Stub the completion handler in the module
    OCMStub([self.mockModule generateRequestWithCertificateChain:[OCMArg any] nonce:[OCMArg any] nonceSignature:[OCMArg any] completionHandler:[OCMArg any]]).andDo(^(NSInvocation *invocation) {
        void (^completionHandler)(PKAddPaymentPassRequest *request);
        [invocation getArgument:&completionHandler atIndex:5];
        completionHandler([PKAddPaymentPassRequest new]);
    });

    [self.module completeAddPaymentPass:@"activationData" encryptedPassData:@"encryptedData" ephemeralPublicKey:@"ephemeralKey"];

    [self waitForExpectationsWithTimeout:5 handler:nil];
}

@end
